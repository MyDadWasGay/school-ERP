import 'identity_models.dart';

class AdmitCardSubject {
  const AdmitCardSubject({
    required this.subjectId,
    required this.subjectName,
    required this.startsAt,
    required this.endsAt,
    this.roomId,
  });

  factory AdmitCardSubject.fromJson(Json json) => AdmitCardSubject(
    subjectId: asString(json['subjectId'], 'admitCardSubject.subjectId'),
    subjectName: asString(
      json['subjectName'],
      'admitCardSubject.subjectName',
    ),
    startsAt: DateTime.parse(
      asString(json['startsAt'], 'admitCardSubject.startsAt'),
    ),
    endsAt: DateTime.parse(
      asString(json['endsAt'], 'admitCardSubject.endsAt'),
    ),
    roomId: json['roomId'] as String?,
  );

  final String subjectId;
  final String subjectName;
  final DateTime startsAt;
  final DateTime endsAt;
  final String? roomId;
}

class AdmitCardStudent {
  const AdmitCardStudent({
    required this.id,
    required this.name,
    required this.admissionNumber,
    required this.className,
    required this.sectionName,
    this.rollNumber,
    this.photoUrl,
  });

  factory AdmitCardStudent.fromJson(Json json) => AdmitCardStudent(
    id: asString(json['id'], 'admitCardStudent.id'),
    name: asString(json['name'], 'admitCardStudent.name'),
    admissionNumber: asString(
      json['admissionNumber'],
      'admitCardStudent.admissionNumber',
    ),
    className: asString(json['className'], 'admitCardStudent.className'),
    sectionName: asString(
      json['sectionName'],
      'admitCardStudent.sectionName',
    ),
    rollNumber: json['rollNumber'] as String?,
    photoUrl: json['photoUrl'] as String?,
  );

  final String id;
  final String name;
  final String admissionNumber;
  final String className;
  final String sectionName;
  final String? rollNumber;
  final String? photoUrl;
}

class AdmitCard {
  const AdmitCard({
    required this.examId,
    required this.examName,
    required this.examStatus,
    required this.student,
    required this.subjects,
    this.startsOn,
    this.endsOn,
  });

  factory AdmitCard.fromJson(Json json) => AdmitCard(
    examId: asString(json['examId'], 'admitCard.examId'),
    examName: asString(json['examName'], 'admitCard.examName'),
    examStatus: asString(json['examStatus'], 'admitCard.examStatus'),
    startsOn: json['startsOn'] == null
        ? null
        : DateTime.parse(asString(json['startsOn'], 'admitCard.startsOn')),
    endsOn: json['endsOn'] == null
        ? null
        : DateTime.parse(asString(json['endsOn'], 'admitCard.endsOn')),
    student: AdmitCardStudent.fromJson(
      asJson(json['student'], 'admitCard.student'),
    ),
    subjects: asJsonList(
      json['subjects'],
      'admitCard.subjects',
    ).map(AdmitCardSubject.fromJson).toList(growable: false),
  );

  final String examId;
  final String examName;
  final String examStatus;
  final DateTime? startsOn;
  final DateTime? endsOn;
  final AdmitCardStudent student;
  final List<AdmitCardSubject> subjects;
}

class ExamPlanningOption {
  const ExamPlanningOption({required this.id, required this.name});

  factory ExamPlanningOption.fromJson(Json json) => ExamPlanningOption(
    id: asString(json['id'], 'examPlanningOption.id'),
    name: asString(json['name'], 'examPlanningOption.name'),
  );

  final String id;
  final String name;
}

class ExamPlanningOptions {
  const ExamPlanningOptions({
    required this.academicYears,
    required this.classes,
    required this.subjects,
  });

  factory ExamPlanningOptions.fromJson(Json json) => ExamPlanningOptions(
    academicYears: asJsonList(
      json['academicYears'],
      'examPlanningOptions.academicYears',
    ).map(ExamPlanningOption.fromJson).toList(growable: false),
    classes: asJsonList(
      json['classes'],
      'examPlanningOptions.classes',
    ).map(ExamPlanningOption.fromJson).toList(growable: false),
    subjects: asJsonList(
      json['subjects'],
      'examPlanningOptions.subjects',
    ).map(ExamPlanningOption.fromJson).toList(growable: false),
  );

  final List<ExamPlanningOption> academicYears;
  final List<ExamPlanningOption> classes;
  final List<ExamPlanningOption> subjects;
}

class QuestionBankRow {
  const QuestionBankRow({
    required this.id,
    required this.prompt,
    required this.questionType,
    required this.maximumMarks,
    required this.subjectId,
    required this.status,
    this.subjectName,
  });

  factory QuestionBankRow.fromJson(Json json) => QuestionBankRow(
    id: asString(json['id'], 'questionBank.id'),
    prompt: asString(json['prompt'], 'questionBank.prompt'),
    questionType: asString(json['questionType'], 'questionBank.questionType'),
    maximumMarks: asInt(json['maximumMarks'], 'questionBank.maximumMarks'),
    subjectId: asString(json['subjectId'], 'questionBank.subjectId'),
    status: asString(json['status'], 'questionBank.status'),
    subjectName: json['subjectName'] as String?,
  );

  final String id;
  final String prompt;
  final String questionType;
  final int maximumMarks;
  final String subjectId;
  final String status;
  final String? subjectName;
}

class DeepExamOption {
  const DeepExamOption({
    required this.id,
    required this.name,
    required this.status,
  });

  factory DeepExamOption.fromJson(Json json) => DeepExamOption(
    id: asString(json['id'], 'deepExam.id'),
    name: asString(json['name'], 'deepExam.name'),
    status: asString(json['status'], 'deepExam.status'),
  );

  final String id;
  final String name;
  final String status;
}

class DeepStudentOption {
  const DeepStudentOption({required this.id, required this.name});

  factory DeepStudentOption.fromJson(Json json) => DeepStudentOption(
    id: asString(json['id'], 'deepStudent.id'),
    name: asString(json['name'], 'deepStudent.name'),
  );

  final String id;
  final String name;
}

class DeepSubjectOption {
  const DeepSubjectOption({required this.id, required this.name});

  factory DeepSubjectOption.fromJson(Json json) => DeepSubjectOption(
    id: asString(json['id'], 'deepSubject.id'),
    name: asString(json['name'], 'deepSubject.name'),
  );

  final String id;
  final String name;
}

class DeepExamOptions {
  const DeepExamOptions({
    required this.exams,
    required this.students,
    required this.subjects,
  });

  factory DeepExamOptions.fromJson(Json json) => DeepExamOptions(
    exams: asJsonList(
      json['exams'],
      'deepExamOptions.exams',
    ).map(DeepExamOption.fromJson).toList(growable: false),
    students: asJsonList(
      json['students'],
      'deepExamOptions.students',
    ).map(DeepStudentOption.fromJson).toList(growable: false),
    subjects: asJsonList(
      json['subjects'],
      'deepExamOptions.subjects',
    ).map(DeepSubjectOption.fromJson).toList(growable: false),
  );

  final List<DeepExamOption> exams;
  final List<DeepStudentOption> students;
  final List<DeepSubjectOption> subjects;
}

class ReportCardRow {
  const ReportCardRow({
    required this.id,
    required this.exam,
    required this.student,
    required this.status,
    required this.generatedAt,
    this.percentage,
    this.total,
    this.maximum,
  });

  factory ReportCardRow.fromJson(Json json) => ReportCardRow(
    id: asString(json['id'], 'reportCard.id'),
    exam: asString(json['exam'], 'reportCard.exam'),
    student: asString(json['student'], 'reportCard.student'),
    status: asString(json['status'], 'reportCard.status'),
    generatedAt: DateTime.parse(
      asString(json['generatedAt'], 'reportCard.generatedAt'),
    ),
    percentage: json['percentage'] == null
        ? null
        : asDouble(json['percentage'], 'reportCard.percentage'),
    total: json['total'] == null
        ? null
        : asInt(json['total'], 'reportCard.total'),
    maximum: json['maximum'] == null
        ? null
        : asInt(json['maximum'], 'reportCard.maximum'),
  );

  final String id;
  final String exam;
  final String student;
  final String status;
  final DateTime generatedAt;
  final double? percentage;
  final int? total;
  final int? maximum;
}
