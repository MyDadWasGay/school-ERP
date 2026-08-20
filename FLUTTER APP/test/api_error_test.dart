import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:school_erp_mobile/core/api/api_error.dart';

void main() {
  test('maps forbidden envelopes without exposing server messages', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/students/private'),
      response: Response<Object?>(
        requestOptions: RequestOptions(path: '/students/private'),
        statusCode: 403,
        data: {
          'error': {
            'code': 'FORBIDDEN',
            'message': 'sensitive internal detail',
            'requestId': 'request-123',
          },
        },
      ),
    );

    final mapped = ApiError.fromDio(error);

    expect(mapped.kind, ApiErrorKind.forbidden);
    expect(mapped.message, 'You do not have access to this information.');
    expect(mapped.message, isNot(contains('internal')));
    expect(mapped.requestId, 'request-123');
  });

  test('identifies an API route miss as a configuration error', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/me'),
      response: Response<Object?>(
        requestOptions: RequestOptions(path: '/me'),
        statusCode: 404,
        data: {
          'message': 'Route GET:/me not found',
          'error': 'Not Found',
          'statusCode': 404,
        },
      ),
    );

    final mapped = ApiError.fromDio(error);

    expect(mapped.kind, ApiErrorKind.configuration);
    expect(mapped.code, 'API_ROUTE_NOT_FOUND');
    expect(mapped.message, contains('/api/v1'));
  });

  test('keeps a real resource miss as not found', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/students/missing'),
      response: Response<Object?>(
        requestOptions: RequestOptions(path: '/students/missing'),
        statusCode: 404,
        data: {
          'error': {'code': 'NOT_FOUND'},
        },
      ),
    );

    expect(ApiError.fromDio(error).kind, ApiErrorKind.notFound);
  });

  test('preserves transient gateway status codes for retry policies', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/attendance/records'),
      response: Response<Object?>(
        requestOptions: RequestOptions(path: '/attendance/records'),
        statusCode: 503,
        data: <String, Object?>{},
      ),
    );

    final mapped = ApiError.fromDio(error);

    expect(mapped.kind, ApiErrorKind.serverFailure);
    expect(mapped.statusCode, 503);
  });
}
