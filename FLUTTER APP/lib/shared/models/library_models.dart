import 'dart:convert';

import 'identity_models.dart';

class LibraryItem {
  const LibraryItem({
    required this.id,
    required this.title,
    required this.author,
    required this.isbn,
    required this.totalCopies,
    required this.availableCopies,
    required this.status,
  });

  factory LibraryItem.fromJson(Json json) => LibraryItem(
    id: asString(json['id'], 'libraryItem.id'),
    title: asString(json['title'], 'libraryItem.title'),
    author: json['author'] as String?,
    isbn: json['isbn'] as String?,
    totalCopies: asInt(json['totalCopies'], 'libraryItem.totalCopies'),
    availableCopies: asInt(
      json['availableCopies'],
      'libraryItem.availableCopies',
    ),
    status: asString(json['status'], 'libraryItem.status'),
  );

  final String id;
  final String title;
  final String? author;
  final String? isbn;
  final int totalCopies;
  final int availableCopies;
  final String status;
}

class LibraryIssue {
  const LibraryIssue({
    required this.id,
    required this.title,
    required this.accessionNumber,
    required this.issuedAt,
    required this.dueAt,
    required this.renewalCount,
  });

  factory LibraryIssue.fromJson(Json json) => LibraryIssue(
    id: asString(json['id'], 'libraryIssue.id'),
    title: asString(json['title'], 'libraryIssue.title'),
    accessionNumber: asString(
      json['accessionNumber'],
      'libraryIssue.accessionNumber',
    ),
    issuedAt: DateTime.parse(
      asString(json['issuedAt'], 'libraryIssue.issuedAt'),
    ),
    dueAt: json['dueAt'] == null
        ? null
        : DateTime.parse(asString(json['dueAt'], 'libraryIssue.dueAt')),
    renewalCount: asInt(json['renewalCount'], 'libraryIssue.renewalCount'),
  );

  final String id;
  final String title;
  final String accessionNumber;
  final DateTime issuedAt;
  final DateTime? dueAt;
  final int renewalCount;
}

class LibraryCopyRow {
  const LibraryCopyRow({
    required this.id,
    required this.accessionNumber,
    required this.status,
    required this.itemId,
    required this.title,
  });

  factory LibraryCopyRow.fromJson(Json json) => LibraryCopyRow(
    id: asString(json['id'], 'libraryCopy.id'),
    accessionNumber: asString(
      json['accessionNumber'],
      'libraryCopy.accessionNumber',
    ),
    status: asString(json['status'], 'libraryCopy.status'),
    itemId: asString(json['itemId'], 'libraryCopy.itemId'),
    title: asString(json['title'], 'libraryCopy.title'),
  );

  final String id;
  final String accessionNumber;
  final String status;
  final String itemId;
  final String title;
}

class LibraryReservationRow {
  const LibraryReservationRow({
    required this.id,
    required this.name,
    required this.itemId,
    required this.status,
    required this.createdAt,
  });

  factory LibraryReservationRow.fromJson(Json json) => LibraryReservationRow(
    id: asString(json['id'], 'libraryReservation.id'),
    name: asString(json['name'], 'libraryReservation.name'),
    itemId: asString(json['itemId'], 'libraryReservation.itemId'),
    status: asString(json['status'], 'libraryReservation.status'),
    createdAt: DateTime.parse(
      asString(json['createdAt'], 'libraryReservation.createdAt'),
    ),
  );

  final String id;
  final String name;
  final String itemId;
  final String status;
  final DateTime createdAt;
}

class DigitalResource {
  const DigitalResource({
    required this.id,
    required this.name,
    required this.status,
    this.url,
    this.description,
  });

  factory DigitalResource.fromJson(Json json) {
    String? url;
    String? description;
    final detailsJson = json['detailsJson'];
    if (detailsJson is String) {
      try {
        final details = asJson(
          jsonDecode(detailsJson),
          'digitalResource.detailsJson',
        );
        url = details['url'] as String?;
        description = details['description'] as String?;
      } on FormatException {
        // The resource remains useful as a named catalog item if legacy
        // metadata is malformed.
      }
    }
    return DigitalResource(
      id: asString(json['id'], 'digitalResource.id'),
      name: asString(json['name'], 'digitalResource.name'),
      status: asString(json['status'], 'digitalResource.status'),
      url: url,
      description: description,
    );
  }

  final String id;
  final String name;
  final String status;
  final String? url;
  final String? description;
}

class LibraryOverview {
  const LibraryOverview({
    required this.items,
    required this.issues,
    required this.resources,
  });

  final List<LibraryItem> items;
  final List<LibraryIssue> issues;
  final List<DigitalResource> resources;
}
