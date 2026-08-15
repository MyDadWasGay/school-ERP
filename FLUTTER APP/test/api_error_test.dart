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
}
