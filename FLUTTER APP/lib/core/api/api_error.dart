import 'package:dio/dio.dart';

enum ApiErrorKind {
  unauthenticated,
  forbidden,
  validation,
  notFound,
  conflict,
  rateLimited,
  networkUnavailable,
  timeout,
  serverFailure,
  unknown,
}

class ApiError implements Exception {
  const ApiError({
    required this.kind,
    required this.message,
    this.code,
    this.requestId,
    this.fields,
  });

  factory ApiError.fromDio(DioException error) {
    if ({
      DioExceptionType.connectionTimeout,
      DioExceptionType.receiveTimeout,
      DioExceptionType.sendTimeout,
    }.contains(error.type)) {
      return const ApiError(
        kind: ApiErrorKind.timeout,
        message: 'The request took too long. Please try again.',
      );
    }
    if (error.type == DioExceptionType.connectionError) {
      return const ApiError(
        kind: ApiErrorKind.networkUnavailable,
        message: 'Check your connection and try again.',
      );
    }
    final status = error.response?.statusCode;
    final body = error.response?.data;
    final envelope = body is Map ? body['error'] : null;
    final details = envelope is Map ? envelope : const <String, Object?>{};
    final code = details['code']?.toString();
    final kind = switch (status) {
      401 => ApiErrorKind.unauthenticated,
      403 => ApiErrorKind.forbidden,
      404 => ApiErrorKind.notFound,
      409 => ApiErrorKind.conflict,
      422 => ApiErrorKind.validation,
      429 => ApiErrorKind.rateLimited,
      500 || 502 || 503 || 504 => ApiErrorKind.serverFailure,
      _ => ApiErrorKind.unknown,
    };
    return ApiError(
      kind: kind,
      code: code,
      requestId: details['requestId']?.toString(),
      fields: details['fields'],
      message: _safeMessage(status, code),
    );
  }

  final ApiErrorKind kind;
  final String message;
  final String? code;
  final String? requestId;
  final Object? fields;

  static String _safeMessage(int? status, String? code) => switch (status) {
    401 => 'Your session has expired. Please sign in again.',
    403 when code == 'TENANT_SCOPE_ERROR' =>
      'This campus is no longer available to your account.',
    403 => 'You do not have access to this information.',
    404 => 'The requested information could not be found.',
    409 => 'This information changed. Refresh and try again.',
    422 => 'Some information is invalid. Review it and try again.',
    429 => 'Too many requests. Please wait a moment and try again.',
    500 ||
    502 ||
    503 ||
    504 => 'The school service is temporarily unavailable. Please try again.',
    _ => 'Something went wrong. Please try again.',
  };

  @override
  String toString() => message;
}

String readableApiError(Object error) {
  if (error is ApiError) return error.message;
  return 'The request could not be completed. Please try again.';
}
