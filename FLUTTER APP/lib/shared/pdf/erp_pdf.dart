import 'dart:convert';
import 'dart:typed_data';

import 'package:share_plus/share_plus.dart';

import '../models/student_models.dart';
import '../models/workspace_models.dart';

class ErpPdfBuilder {
  static Uint8List feeReceipt({
    required String schoolName,
    required String studentName,
    required StudentPaymentRow payment,
  }) {
    final amount =
        '${payment.currency} ${(payment.amountMinor / 100).toStringAsFixed(2)}';
    return _document([
      schoolName,
      'FEE PAYMENT RECEIPT',
      '',
      'Student: $studentName',
      'Receipt: ${payment.receiptNumber}',
      'Invoice: ${payment.invoiceNumber}',
      'Amount: $amount',
      'Method: ${payment.method.replaceAll('_', ' ')}',
      'Paid: ${payment.paidAt.toLocal()}',
      'Status: ${payment.status.replaceAll('_', ' ')}',
      if (payment.providerReference?.isNotEmpty == true)
        'Reference: ${payment.providerReference}',
    ]);
  }

  static Uint8List payslip({
    required String schoolName,
    required PayslipRow payslip,
  }) {
    final snapshot = payslip.snapshot ?? const <String, Object?>{};
    String value(String key) => snapshot[key]?.toString() ?? 'Not available';
    return _document([
      schoolName,
      'PAYSLIP',
      '',
      'Employee: ${payslip.employeeName}',
      'Employee number: ${payslip.employeeNumber}',
      'Period: ${payslip.period}',
      'Issued: ${payslip.issuedAt}',
      '',
      'Basic salary: INR ${(snapshot['salaryMinor'] is num ? (snapshot['salaryMinor']! as num) / 100 : 0).toStringAsFixed(2)}',
      'Allowances: INR ${(snapshot['allowanceMinor'] is num ? (snapshot['allowanceMinor']! as num) / 100 : 0).toStringAsFixed(2)}',
      'Percentage deductions: INR ${(snapshot['percentageDeductionMinor'] is num ? (snapshot['percentageDeductionMinor']! as num) / 100 : 0).toStringAsFixed(2)}',
      'Fixed deductions: INR ${(snapshot['fixedDeductionMinor'] is num ? (snapshot['fixedDeductionMinor']! as num) / 100 : 0).toStringAsFixed(2)}',
      'Gross: ${payslip.gross}',
      'Deductions: ${payslip.deductions}',
      'Net pay: ${payslip.net}',
      if (snapshot['jobTitle'] is String && value('jobTitle').isNotEmpty)
        'Role: ${value('jobTitle')}',
      'Status: ${payslip.status.replaceAll('_', ' ')}',
    ]);
  }

  static Uint8List paymentReceipt({
    required String schoolName,
    required PaymentRow payment,
  }) => _document([
    schoolName,
    'FEE PAYMENT RECEIPT',
    '',
    'Receipt: ${payment.receiptNumber}',
    'Amount: ${payment.amount}',
    'Method: ${payment.method.replaceAll('_', ' ')}',
    'Paid: ${payment.paidAt}',
    'Status: ${payment.status.replaceAll('_', ' ')}',
  ]);

  static Uint8List _document(List<String> lines) {
    final content = StringBuffer()
      ..writeln('BT')
      ..writeln('/F1 16 Tf')
      ..writeln('50 790 Td');
    for (var index = 0; index < lines.length; index++) {
      final size = index == 0
          ? 16
          : index == 1
          ? 13
          : 10;
      content
        ..writeln('/F1 $size Tf')
        ..writeln('(${_escape(lines[index])}) Tj')
        ..writeln('0 -22 Td');
    }
    content.writeln('ET');
    final contentBytes = latin1.encode(content.toString());
    final objects = <String>[
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Length ${contentBytes.length} >>\nstream\n${content.toString()}endstream',
    ];
    final bytes = BytesBuilder();
    bytes.add(latin1.encode('%PDF-1.4\n'));
    final offsets = <int>[];
    for (var index = 0; index < objects.length; index++) {
      offsets.add(bytes.length);
      bytes.add(
        latin1.encode('${index + 1} 0 obj\n${objects[index]}\nendobj\n'),
      );
    }
    final xrefOffset = bytes.length;
    bytes.add(latin1.encode('xref\n0 ${objects.length + 1}\n'));
    bytes.add(latin1.encode('0000000000 65535 f \n'));
    for (final offset in offsets) {
      bytes.add(
        latin1.encode('${offset.toString().padLeft(10, '0')} 00000 n \n'),
      );
    }
    bytes.add(
      latin1.encode(
        'trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n$xrefOffset\n%%EOF\n',
      ),
    );
    return bytes.toBytes();
  }

  static String _escape(String value) {
    final ascii = value.runes
        .map(
          (rune) => rune >= 32 && rune <= 126 ? String.fromCharCode(rune) : '?',
        )
        .join();
    return ascii
        .replaceAll(r'\', r'\\')
        .replaceAll('(', r'\(')
        .replaceAll(')', r'\)');
  }
}

Future<void> shareErpPdf({
  required Uint8List bytes,
  required String filename,
  required String title,
}) async {
  await SharePlus.instance.share(
    ShareParams(
      title: title,
      text: title,
      files: [XFile.fromData(bytes, mimeType: 'application/pdf')],
      fileNameOverrides: [filename],
    ),
  );
}
