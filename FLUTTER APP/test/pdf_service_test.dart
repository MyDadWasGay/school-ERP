import 'package:flutter_test/flutter_test.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:school_erp_mobile/shared/pdf/erp_pdf.dart';
import 'package:school_erp_mobile/shared/models/workspace_models.dart';

void main() {
  test('builds a paginated PDF through the service boundary', () async {
    final service = ErpPdfService(
      fontLoader: (_) async => PdfFontSet(
        base: pw.Font.helvetica(),
        bold: pw.Font.helveticaBold(),
      ),
    );

    final bytes = await service.paymentReceipt(
      schoolName: 'Saraswati School',
      payment: const PaymentRow(
        id: 'payment-1',
        receiptNumber: 'REC-001',
        amount: '₹ 1,250.00',
        method: 'cash',
        paidAt: '2026-08-20T09:00:00Z',
        status: 'paid',
      ),
    );

    expect(bytes, isNotEmpty);
    expect(String.fromCharCodes(bytes.take(8)), startsWith('%PDF-'));
    expect(bytes.length, greaterThan(500));
  });
}
