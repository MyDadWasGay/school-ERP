import 'identity_models.dart';

class FinanceRefundOption {
  const FinanceRefundOption({
    required this.id,
    required this.label,
    required this.remainingMinor,
  });

  factory FinanceRefundOption.fromJson(Json json) => FinanceRefundOption(
    id: asString(json['id'], 'refundOption.id'),
    label: asString(json['label'], 'refundOption.label'),
    remainingMinor: asInt(
      json['remainingMinor'],
      'refundOption.remainingMinor',
    ),
  );

  final String id;
  final String label;
  final int remainingMinor;
}

class FinanceAccountRow {
  const FinanceAccountRow({
    required this.id,
    required this.code,
    required this.name,
    required this.accountType,
    required this.status,
    this.parentId,
  });

  factory FinanceAccountRow.fromJson(Json json) => FinanceAccountRow(
    id: asString(json['id'], 'account.id'),
    code: asString(json['code'], 'account.code'),
    name: asString(json['name'], 'account.name'),
    accountType: asString(json['accountType'], 'account.accountType'),
    status: asString(json['status'], 'account.status'),
    parentId: json['parentId'] as String?,
  );

  final String id;
  final String code;
  final String name;
  final String accountType;
  final String status;
  final String? parentId;
}

class FinanceExpenseRow {
  const FinanceExpenseRow({
    required this.id,
    required this.accountId,
    required this.description,
    required this.amountMinor,
    required this.incurredOn,
    required this.status,
  });

  factory FinanceExpenseRow.fromJson(Json json) => FinanceExpenseRow(
    id: asString(json['id'], 'expense.id'),
    accountId: asString(json['accountId'], 'expense.accountId'),
    description: asString(json['description'], 'expense.description'),
    amountMinor: asInt(json['amountMinor'], 'expense.amountMinor'),
    incurredOn: DateTime.parse(
      asString(json['incurredOn'], 'expense.incurredOn'),
    ),
    status: asString(json['status'], 'expense.status'),
  );

  final String id;
  final String accountId;
  final String description;
  final int amountMinor;
  final DateTime incurredOn;
  final String status;
}

class FinanceLedgerRow {
  const FinanceLedgerRow({
    required this.id,
    required this.referenceType,
    required this.referenceId,
    required this.account,
    required this.debitMinor,
    required this.creditMinor,
    required this.postedAt,
    required this.status,
  });

  factory FinanceLedgerRow.fromJson(Json json) => FinanceLedgerRow(
    id: asString(json['id'], 'ledger.id'),
    referenceType: asString(json['referenceType'], 'ledger.referenceType'),
    referenceId: asString(json['referenceId'], 'ledger.referenceId'),
    account: asString(json['account'], 'ledger.account'),
    debitMinor: asInt(json['debitMinor'], 'ledger.debitMinor'),
    creditMinor: asInt(json['creditMinor'], 'ledger.creditMinor'),
    postedAt: DateTime.parse(asString(json['postedAt'], 'ledger.postedAt')),
    status: asString(json['status'], 'ledger.status'),
  );

  final String id;
  final String referenceType;
  final String referenceId;
  final String account;
  final int debitMinor;
  final int creditMinor;
  final DateTime postedAt;
  final String status;
}

class FinanceDonationRow {
  const FinanceDonationRow({
    required this.id,
    required this.donorName,
    required this.amountMinor,
    required this.purpose,
    required this.receivedAt,
    required this.status,
    this.donorEmail,
    this.paymentReference,
  });

  factory FinanceDonationRow.fromJson(Json json) => FinanceDonationRow(
    id: asString(json['id'], 'donation.id'),
    donorName: asString(json['donorName'], 'donation.donorName'),
    amountMinor: asInt(json['amountMinor'], 'donation.amountMinor'),
    purpose: asString(json['purpose'], 'donation.purpose'),
    receivedAt: DateTime.parse(
      asString(json['receivedAt'], 'donation.receivedAt'),
    ),
    status: asString(json['status'], 'donation.status'),
    donorEmail: json['donorEmail'] as String?,
    paymentReference: json['paymentReference'] as String?,
  );

  final String id;
  final String donorName;
  final int amountMinor;
  final String purpose;
  final DateTime receivedAt;
  final String status;
  final String? donorEmail;
  final String? paymentReference;
}

class FeeHeadRow {
  const FeeHeadRow({
    required this.id,
    required this.name,
    required this.code,
    required this.status,
  });
  factory FeeHeadRow.fromJson(Json json) => FeeHeadRow(
    id: asString(json['id'], 'feeHead.id'),
    name: asString(json['name'], 'feeHead.name'),
    code: asString(json['code'], 'feeHead.code'),
    status: asString(json['status'], 'feeHead.status'),
  );
  final String id;
  final String name;
  final String code;
  final String status;
}

class FeeStructureRow {
  const FeeStructureRow({
    required this.id,
    required this.name,
    required this.academicYearId,
    required this.status,
    required this.effectiveFrom,
    this.classId,
  });
  factory FeeStructureRow.fromJson(Json json) => FeeStructureRow(
    id: asString(json['id'], 'feeStructure.id'),
    name: asString(json['name'], 'feeStructure.name'),
    academicYearId: asString(
      json['academicYearId'],
      'feeStructure.academicYearId',
    ),
    status: asString(json['status'], 'feeStructure.status'),
    effectiveFrom: DateTime.parse(
      asString(json['effectiveFrom'], 'feeStructure.effectiveFrom'),
    ),
    classId: json['classId'] as String?,
  );
  final String id;
  final String name;
  final String academicYearId;
  final String status;
  final DateTime effectiveFrom;
  final String? classId;
}

class FeeInstallmentRow {
  const FeeInstallmentRow({
    required this.id,
    required this.name,
    required this.feeStructureId,
    required this.feeHeadId,
    required this.amountMinor,
    required this.dueOn,
    required this.status,
  });
  factory FeeInstallmentRow.fromJson(Json json) => FeeInstallmentRow(
    id: asString(json['id'], 'feeInstallment.id'),
    name: asString(json['name'], 'feeInstallment.name'),
    feeStructureId: asString(
      json['feeStructureId'],
      'feeInstallment.feeStructureId',
    ),
    feeHeadId: asString(json['feeHeadId'], 'feeInstallment.feeHeadId'),
    amountMinor: asInt(json['amountMinor'], 'feeInstallment.amountMinor'),
    dueOn: DateTime.parse(asString(json['dueOn'], 'feeInstallment.dueOn')),
    status: asString(json['status'], 'feeInstallment.status'),
  );
  final String id;
  final String name;
  final String feeStructureId;
  final String feeHeadId;
  final int amountMinor;
  final DateTime dueOn;
  final String status;
}

class FinanceSetupOption {
  const FinanceSetupOption({required this.id, required this.name});
  factory FinanceSetupOption.fromJson(Json json) => FinanceSetupOption(
    id: asString(json['id'], 'financeSetupOption.id'),
    name: asString(json['name'], 'financeSetupOption.name'),
  );
  final String id;
  final String name;
}

class FinanceConfiguration {
  const FinanceConfiguration({
    required this.heads,
    required this.structures,
    required this.installments,
    required this.years,
    required this.classes,
  });
  factory FinanceConfiguration.fromJson(Json json) => FinanceConfiguration(
    heads: asJsonList(
      json['heads'],
      'feeConfiguration.heads',
    ).map(FeeHeadRow.fromJson).toList(growable: false),
    structures: asJsonList(
      json['structures'],
      'feeConfiguration.structures',
    ).map(FeeStructureRow.fromJson).toList(growable: false),
    installments: asJsonList(
      json['installments'],
      'feeConfiguration.installments',
    ).map(FeeInstallmentRow.fromJson).toList(growable: false),
    years: asJsonList(
      json['years'],
      'feeConfiguration.years',
    ).map(FinanceSetupOption.fromJson).toList(growable: false),
    classes: asJsonList(
      json['classes'],
      'feeConfiguration.classes',
    ).map(FinanceSetupOption.fromJson).toList(growable: false),
  );
  final List<FeeHeadRow> heads;
  final List<FeeStructureRow> structures;
  final List<FeeInstallmentRow> installments;
  final List<FinanceSetupOption> years;
  final List<FinanceSetupOption> classes;
}

class FinanceInvoiceStudentOption {
  const FinanceInvoiceStudentOption({required this.id, required this.name});
  factory FinanceInvoiceStudentOption.fromJson(Json json) =>
      FinanceInvoiceStudentOption(
        id: asString(json['id'], 'invoiceStudent.id'),
        name: asString(json['name'], 'invoiceStudent.name'),
      );
  final String id;
  final String name;
}
