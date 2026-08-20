import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import '../models/exam_models.dart';
import '../models/student_models.dart';
import '../models/workspace_models.dart';

typedef PdfFontLoader = Future<PdfFontSet> Function(List<String> content);

class PdfFontSet {
  const PdfFontSet({
    required this.base,
    required this.bold,
    this.fallbacks = const [],
  });

  final pw.Font base;
  final pw.Font bold;
  final List<pw.Font> fallbacks;
}

class ErpPdfService {
  ErpPdfService({PdfFontLoader? fontLoader})
    : _fontLoader = fontLoader ?? _loadFonts;

  final PdfFontLoader _fontLoader;

  Future<Uint8List> feeReceipt({
    required String schoolName,
    required String studentName,
    required StudentPaymentRow payment,
  }) => _build(
    title: 'FEE PAYMENT RECEIPT',
    content: [
      ['Student', studentName],
      ['Receipt', payment.receiptNumber],
      ['Invoice', payment.invoiceNumber],
      ['Amount', _money(payment.currency, payment.amountMinor)],
      ['Method', payment.method.replaceAll('_', ' ')],
      ['Paid', payment.paidAt.toLocal().toString()],
      ['Status', payment.status.replaceAll('_', ' ')],
      if (payment.providerReference?.isNotEmpty == true)
        ['Reference', payment.providerReference!],
    ],
    schoolName: schoolName,
  );

  Future<Uint8List> payslip({
    required String schoolName,
    required PayslipRow payslip,
  }) {
    final snapshot = payslip.snapshot ?? const <String, Object?>{};
    String value(String key) => snapshot[key]?.toString() ?? 'Not available';
    String minorValue(String key) {
      final value = snapshot[key];
      final minor = value is num ? value : 0;
      return _money('INR', minor.toInt());
    }

    return _build(
      title: 'PAYSLIP',
      content: [
        ['Employee', payslip.employeeName],
        ['Employee number', payslip.employeeNumber],
        ['Period', payslip.period],
        ['Issued', payslip.issuedAt],
        ['Basic salary', minorValue('salaryMinor')],
        ['Allowances', minorValue('allowanceMinor')],
        ['Percentage deductions', minorValue('percentageDeductionMinor')],
        ['Fixed deductions', minorValue('fixedDeductionMinor')],
        ['Gross', payslip.gross],
        ['Deductions', payslip.deductions],
        ['Net pay', payslip.net],
        if (snapshot['jobTitle'] is String && value('jobTitle').isNotEmpty)
          ['Role', value('jobTitle')],
        ['Status', payslip.status.replaceAll('_', ' ')],
      ],
      schoolName: schoolName,
    );
  }

  Future<Uint8List> paymentReceipt({
    required String schoolName,
    required PaymentRow payment,
  }) => _build(
    title: 'FEE PAYMENT RECEIPT',
    content: [
      ['Receipt', payment.receiptNumber],
      ['Amount', payment.amount],
      ['Method', payment.method.replaceAll('_', ' ')],
      ['Paid', payment.paidAt],
      ['Status', payment.status.replaceAll('_', ' ')],
    ],
    schoolName: schoolName,
  );

  Future<Uint8List> admitCard({
    required String schoolName,
    required AdmitCard card,
  }) => _build(
    title: 'EXAM ADMIT CARD',
    content: [
      ['Examination', card.examName],
      if (card.startsOn != null)
        ['Exam dates', _dateRange(card.startsOn!, card.endsOn)],
      ['Student', card.student.name],
      ['Admission number', card.student.admissionNumber],
      [
        'Class / section',
        '${card.student.className} / ${card.student.sectionName}',
      ],
      if (card.student.rollNumber?.isNotEmpty == true)
        ['Roll number', card.student.rollNumber!],
      ['Subjects and venues', card.subjects.map(_subjectLine).join('\n')],
      [
        'Instructions',
        'Carry this admit card and arrive at the examination room before the scheduled start time.',
      ],
    ],
    schoolName: schoolName,
  );

  Future<Uint8List> _build({
    required String schoolName,
    required String title,
    required List<List<String>> content,
  }) async {
    final lines = [
      schoolName,
      title,
      for (final row in content) ...row,
    ];
    final fonts = await _fontLoader(lines);
    final document = pw.Document(
      theme: pw.ThemeData.withFont(
        base: fonts.base,
        bold: fonts.bold,
        fontFallback: fonts.fallbacks,
      ),
    );
    document.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.fromLTRB(42, 48, 42, 48),
        header: (context) => _header(schoolName, title),
        footer: (context) => pw.Align(
          alignment: pw.Alignment.centerRight,
          child: pw.Text(
            'Page ${context.pageNumber} of ${context.pagesCount}',
            style: const pw.TextStyle(fontSize: 8),
          ),
        ),
        build: (context) => [
          pw.SizedBox(height: 18),
          pw.TableHelper.fromTextArray(
            headers: const ['Field', 'Details'],
            data: content,
            headerStyle: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.white,
            ),
            headerDecoration: const pw.BoxDecoration(
              color: PdfColors.blueGrey800,
            ),
            cellStyle: const pw.TextStyle(fontSize: 10),
            cellPadding: const pw.EdgeInsets.all(8),
            border: pw.TableBorder.all(
              color: PdfColors.blueGrey200,
              width: 0.5,
            ),
            columnWidths: const {
              0: pw.FlexColumnWidth(1.1),
              1: pw.FlexColumnWidth(2.9),
            },
          ),
        ],
      ),
    );
    return document.save();
  }

  pw.Widget _header(String schoolName, String title) => pw.Column(
    crossAxisAlignment: pw.CrossAxisAlignment.start,
    children: [
      pw.Text(
        schoolName,
        style: pw.TextStyle(fontSize: 17, fontWeight: pw.FontWeight.bold),
      ),
      pw.SizedBox(height: 4),
      pw.Text(title, style: const pw.TextStyle(fontSize: 12)),
      pw.Divider(color: PdfColors.blueGrey300),
    ],
  );

  static String _money(String currency, int amountMinor) {
    final amount = (amountMinor / 100).toStringAsFixed(2);
    return currency.toUpperCase() == 'INR'
        ? '₹ $amount'
        : '$currency $amount';
  }

  static String _dateRange(DateTime startsOn, DateTime? endsOn) {
    final start = startsOn.toLocal().toString().split(' ').first;
    final end = endsOn?.toLocal().toString().split(' ').first;
    return end == null || end == start ? start : '$start - $end';
  }

  static String _subjectLine(AdmitCardSubject subject) {
    final localStart = subject.startsAt.toLocal();
    final localEnd = subject.endsAt.toLocal();
    final date = localStart.toString().split(' ').first;
    final start = localStart.toString().substring(11, 16);
    final end = localEnd.toString().substring(11, 16);
    return '${subject.subjectName} | $date $start-$end | Room ${subject.roomId ?? 'To be assigned'}';
  }

  static Future<PdfFontSet> _loadFonts(List<String> content) async {
    final base = await PdfGoogleFonts.notoSansRegular();
    final bold = await PdfGoogleFonts.notoSansBold();
    final fallbackLoaders = <Future<pw.Font> Function()>[];
    if (_containsRange(content, 0x0900, 0x097f)) {
      fallbackLoaders.add(PdfGoogleFonts.notoSansDevanagariRegular);
    }
    if (_containsRange(content, 0x0980, 0x09ff)) {
      fallbackLoaders.add(PdfGoogleFonts.notoSansBengaliRegular);
    }
    if (_containsRange(content, 0x0a80, 0x0aff)) {
      fallbackLoaders.add(PdfGoogleFonts.notoSansGujaratiRegular);
    }
    if (_containsRange(content, 0x0a00, 0x0a7f)) {
      fallbackLoaders.add(PdfGoogleFonts.notoSansGurmukhiRegular);
    }
    if (_containsRange(content, 0x0c80, 0x0cff)) {
      fallbackLoaders.add(PdfGoogleFonts.notoSansKannadaRegular);
    }
    if (_containsRange(content, 0x0d00, 0x0d7f)) {
      fallbackLoaders.add(PdfGoogleFonts.notoSansMalayalamRegular);
    }
    if (_containsRange(content, 0x0b80, 0x0bff)) {
      fallbackLoaders.add(PdfGoogleFonts.notoSansTamilRegular);
    }
    if (_containsRange(content, 0x0c00, 0x0c7f)) {
      fallbackLoaders.add(PdfGoogleFonts.notoSansTeluguRegular);
    }
    return PdfFontSet(
      base: base,
      bold: bold,
      fallbacks: await Future.wait(fallbackLoaders.map((load) => load())),
    );
  }

  static bool _containsRange(
    Iterable<String> content,
    int start,
    int end,
  ) => content.any(
    (value) => value.runes.any((rune) => rune >= start && rune <= end),
  );
}

class ErpPdfBuilder {
  static final _service = ErpPdfService();

  static Future<Uint8List> feeReceipt({
    required String schoolName,
    required String studentName,
    required StudentPaymentRow payment,
  }) => _service.feeReceipt(
    schoolName: schoolName,
    studentName: studentName,
    payment: payment,
  );

  static Future<Uint8List> payslip({
    required String schoolName,
    required PayslipRow payslip,
  }) => _service.payslip(schoolName: schoolName, payslip: payslip);

  static Future<Uint8List> paymentReceipt({
    required String schoolName,
    required PaymentRow payment,
  }) => _service.paymentReceipt(schoolName: schoolName, payment: payment);

  static Future<Uint8List> admitCard({
    required String schoolName,
    required AdmitCard card,
  }) => _service.admitCard(schoolName: schoolName, card: card);
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

Future<bool> printErpPdf({
  required Uint8List bytes,
  required String filename,
}) => Printing.layoutPdf(name: filename, onLayout: (_) => bytes);
