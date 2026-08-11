import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { messageSchema } from "../../../features/communication/schemas/communication.schema";
import { noticeSchema, noticeTransitionSchema } from "../../../features/communication/schemas/notice.schema";
import { createMessage, listMessages, listNotificationDelivery, listNotifications, publishMessage } from "../../../features/communication/services/communication.service";
import { createNotice, listNotices, transitionNotice } from "../../../features/communication/services/notice.service";
import { issueLibraryCopySchema, libraryCopySchema, libraryItemSchema, renewLibraryCopySchema, returnLibraryCopySchema, digitalResourceSchema, libraryReservationSchema } from "../../../features/library/schemas/library.schema";
import { addLibraryCopy, createDigitalResource, createLibraryItem, issueLibraryCopy, listActiveLibraryIssues, listDigitalResources, listLibraryBorrowers, listLibraryCopies, listLibraryItems, listLibraryReservations, reserveLibraryItem, renewLibraryCopy, returnLibraryCopy } from "../../../features/library/services/library.service";
import { routeAllocationSchema, transportRouteSchema, transportStopSchema, vehicleDocumentSchema, vehicleSchema } from "../../../features/transport/schemas/transport.schema";
import { allocateStudentToRoute, createTransportRoute, createTransportStop, createTransportVehicle, createVehicleDocument, listRouteAllocations, listTransportRoutes, listTransportStops, listTransportStudents, listTransportVehicles, listVehicleDocuments } from "../../../features/transport/services/transport.service";
import { hostelAllotmentSchema, hostelBedSchema, hostelRoomSchema } from "../../../features/hostel/schemas/hostel.schema";
import { allocateHostelBed, checkoutHostelAllotment, createHostelBed, createHostelRoom, listHostelAllotments, listHostelBeds, listHostelRooms, listHostelStudents } from "../../../features/hostel/services/hostel.service";
import { canteenTransactionSchema, menuSchema } from "../../../features/canteen/schemas/canteen.schema";
import { createCanteenTransaction, createMenu, listCanteenStudents, listCanteenTransactions, listMenus } from "../../../features/canteen/services/canteen.service";
import { authenticateApiRequest, requireApiCsrf, requireApiPermission } from "../auth/bearer-auth";
import { apiCreated, apiSuccess, auditCommand, parseApiBody, queryString, routeSchema } from "./route-utils";

type IdParams = { id: string };
const authenticated = { preHandler: authenticateApiRequest };
const mutation = { preHandler: [authenticateApiRequest, requireApiCsrf] };
const messagePublishSchema = z.object({ messageId: z.string().min(1) });
const checkoutSchema = z.object({ allotmentId: z.string().min(1) });

export const supportRoutes: FastifyPluginAsync = async (app) => {
  app.get("/communication/messages", authenticated, async (request) => {
    const user = requireApiPermission(request, "communication:read");
    return apiSuccess(request, await listMessages(user));
  });

  app.get("/communication/notifications", authenticated, async (request) => {
    const user = requireApiPermission(request, "communication:read");
    return apiSuccess(request, await listNotifications(user));
  });

  app.get("/communication/notification-delivery", authenticated, async (request) => {
    const user = requireApiPermission(request, "communication:read");
    return apiSuccess(request, await listNotificationDelivery(user));
  });

  app.post<{ Body: unknown }>("/communication/messages", { ...mutation, schema: routeSchema("Create a communication message") }, async (request, reply) => {
    const user = requireApiPermission(request, "communication:create");
    const input = parseApiBody(messageSchema, request.body);
    const row = await createMessage(user, input);
    await auditCommand(user, { action: "create", module: "communication", entityType: "message", entityId: row.id, campusId: row.campusId, after: { subject: row.subject, status: row.status } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Params: IdParams }>("/communication/messages/:id/publish", mutation, async (request) => {
    const user = requireApiPermission(request, "communication:update");
    const result = await publishMessage(user, parseApiBody(messagePublishSchema, { messageId: request.params.id }).messageId);
    await auditCommand(user, { action: "update", module: "communication", entityType: "message", entityId: result.message.id, campusId: result.message.campusId, after: { status: result.message.status, recipientCount: result.recipientCount } });
    return apiSuccess(request, { id: result.message.id, recipientCount: result.recipientCount });
  });

  app.get("/communication/notices", authenticated, async (request) => {
    const user = requireApiPermission(request, "communication:read");
    return apiSuccess(request, await listNotices(user));
  });

  app.post<{ Body: unknown }>("/communication/notices", { ...mutation, schema: routeSchema("Create a notice") }, async (request, reply) => {
    const user = requireApiPermission(request, "communication:create");
    const input = parseApiBody(noticeSchema, request.body);
    const row = await createNotice(user, input);
    await auditCommand(user, { action: "create", module: "communication", entityType: "notice", entityId: row.id, campusId: row.campusId, after: { title: row.title, audience: row.audience } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.patch<{ Params: IdParams; Body: unknown }>("/communication/notices/:id", { ...mutation, schema: routeSchema("Transition a notice") }, async (request) => {
    const user = requireApiPermission(request, "communication:update");
    const input = parseApiBody(noticeTransitionSchema, { ...(request.body as Record<string, unknown>), id: request.params.id });
    const row = await transitionNotice(user, input.id, input.status);
    await auditCommand(user, { action: "update", module: "communication", entityType: "notice", entityId: row.id, campusId: row.campusId, after: { status: row.status } });
    return apiSuccess(request, { id: row.id });
  });

  app.get<{ Querystring: { search?: string } }>("/library/items", authenticated, async (request) => {
    const user = requireApiPermission(request, "library:read");
    return apiSuccess(request, await listLibraryItems(user, queryString(request.query.search)));
  });

  app.get<{ Querystring: { itemId?: string; availableOnly?: boolean | string } }>("/library/copies", authenticated, async (request) => {
    const user = requireApiPermission(request, "library:read");
    const availableOnly = request.query.availableOnly === undefined
      ? true
      : request.query.availableOnly === true || request.query.availableOnly === "true";
    return apiSuccess(request, await listLibraryCopies(user, queryString(request.query.itemId), availableOnly));
  });

  app.get("/library/issues", authenticated, async (request) => {
    const user = requireApiPermission(request, "library:read");
    return apiSuccess(request, { active: await listActiveLibraryIssues(user), borrowers: await listLibraryBorrowers(user) });
  });

  app.get("/library/reservations", authenticated, async (request) => {
    const user = requireApiPermission(request, "library:read");
    return apiSuccess(request, await listLibraryReservations(user));
  });

  app.get("/library/digital-resources", authenticated, async (request) => {
    const user = requireApiPermission(request, "library:read");
    return apiSuccess(request, await listDigitalResources(user));
  });

  app.post<{ Body: unknown }>("/library/items", { ...mutation, schema: routeSchema("Create a library item") }, async (request, reply) => {
    const user = requireApiPermission(request, "library:create");
    const input = parseApiBody(libraryItemSchema, request.body);
    const row = await createLibraryItem(user, input);
    await auditCommand(user, { action: "create", module: "library", entityType: "library_item", entityId: row.id, after: { title: row.title, isbn: row.isbn } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Body: unknown }>("/library/copies", { ...mutation, schema: routeSchema("Add a library copy") }, async (request, reply) => {
    const user = requireApiPermission(request, "library:create");
    const input = parseApiBody(libraryCopySchema, request.body);
    const row = await addLibraryCopy(user, input);
    await auditCommand(user, { action: "create", module: "library", entityType: "library_copy", entityId: row.id, after: { accessionNumber: row.accessionNumber, itemId: row.itemId } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Body: unknown }>("/library/issues", { ...mutation, schema: routeSchema("Issue a library copy") }, async (request, reply) => {
    const user = requireApiPermission(request, "library:create");
    const input = parseApiBody(issueLibraryCopySchema, request.body);
    const row = await issueLibraryCopy(user, input);
    await auditCommand(user, { action: "create", module: "library", entityType: "library_issue", entityId: row.id, campusId: row.campusId, metadata: { borrowerType: row.borrowerType, borrowerId: row.borrowerId } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Body: unknown }>("/library/issues/return", { ...mutation, schema: routeSchema("Return a library copy") }, async (request) => {
    const user = requireApiPermission(request, "library:update");
    const input = parseApiBody(returnLibraryCopySchema, request.body);
    const result = await returnLibraryCopy(user, input);
    await auditCommand(user, { action: "update", module: "library", entityType: "library_issue", entityId: result.issue.id, campusId: result.issue.campusId, metadata: { outcome: input.outcome, fineMinor: result.fineMinor, overdueDays: result.overdueDays } });
    return apiSuccess(request, { id: result.issue.id, fineMinor: result.fineMinor });
  });

  app.post<{ Body: unknown }>("/library/issues/renew", { ...mutation, schema: routeSchema("Renew a library copy") }, async (request) => {
    const user = requireApiPermission(request, "library:update");
    const input = parseApiBody(renewLibraryCopySchema, request.body);
    const row = await renewLibraryCopy(user, input);
    await auditCommand(user, { action: "update", module: "library", entityType: "library_issue", entityId: row.id, campusId: row.campusId, metadata: { renewalCount: row.renewalCount, dueAt: row.dueAt } });
    return apiSuccess(request, { id: row.id });
  });

  app.post<{ Body: unknown }>("/library/reservations", { ...mutation, schema: routeSchema("Reserve a library item") }, async (request, reply) => {
    const user = requireApiPermission(request, "library:update");
    const input = parseApiBody(libraryReservationSchema, request.body);
    const row = await reserveLibraryItem(user, input);
    await auditCommand(user, { action: "create", module: "library", entityType: "library_reservation", entityId: row.id, campusId: row.campusId, after: { itemId: row.referenceId, status: row.status } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.post<{ Body: unknown }>("/library/digital-resources", { ...mutation, schema: routeSchema("Create a digital library resource") }, async (request, reply) => {
    const user = requireApiPermission(request, "library:create");
    const input = parseApiBody(digitalResourceSchema, request.body);
    const row = await createDigitalResource(user, input);
    await auditCommand(user, { action: "create", module: "library", entityType: "digital_resource", entityId: row.id, campusId: row.campusId, after: { name: row.name } });
    return apiCreated(reply, request, { id: row.id });
  });

  app.get("/transport/routes", authenticated, async (request) => apiSuccess(request, await listTransportRoutes(requireApiPermission(request, "transport:read"))));
  app.get("/transport/vehicles", authenticated, async (request) => apiSuccess(request, await listTransportVehicles(requireApiPermission(request, "transport:read"))));
  app.get("/transport/documents", authenticated, async (request) => apiSuccess(request, await listVehicleDocuments(requireApiPermission(request, "transport:read"))));
  app.get("/transport/stops", authenticated, async (request) => apiSuccess(request, await listTransportStops(requireApiPermission(request, "transport:read"))));
  app.get("/transport/students", authenticated, async (request) => apiSuccess(request, await listTransportStudents(requireApiPermission(request, "transport:read"))));
  app.get("/transport/allocations", authenticated, async (request) => apiSuccess(request, await listRouteAllocations(requireApiPermission(request, "transport:read"))));

  app.post<{ Body: unknown }>("/transport/vehicles", { ...mutation, schema: routeSchema("Create a transport vehicle") }, async (request, reply) => { const user = requireApiPermission(request, "transport:create"); const input = parseApiBody(vehicleSchema, request.body); const row = await createTransportVehicle(user, input); await auditCommand(user, { action: "create", module: "transport", entityType: "vehicle", entityId: row.id, campusId: row.campusId, after: { registrationNumber: row.registrationNumber, capacity: row.capacity } }); return apiCreated(reply, request, { id: row.id }); });
  app.post<{ Body: unknown }>("/transport/vehicle-documents", { ...mutation, schema: routeSchema("Record a vehicle document") }, async (request, reply) => { const user = requireApiPermission(request, "transport:update"); const input = parseApiBody(vehicleDocumentSchema, request.body); const row = await createVehicleDocument(user, input); await auditCommand(user, { action: "create", module: "transport", entityType: "vehicle_document", entityId: row.id, campusId: row.campusId, after: { documentType: row.name, vehicleId: row.referenceId } }); return apiCreated(reply, request, { id: row.id }); });
  app.post<{ Body: unknown }>("/transport/routes", { ...mutation, schema: routeSchema("Create a transport route") }, async (request, reply) => { const user = requireApiPermission(request, "transport:create"); const input = parseApiBody(transportRouteSchema, request.body); const row = await createTransportRoute(user, input); await auditCommand(user, { action: "create", module: "transport", entityType: "route", entityId: row.id, campusId: row.campusId, after: { name: row.name, capacity: row.capacity } }); return apiCreated(reply, request, { id: row.id }); });
  app.post<{ Body: unknown }>("/transport/stops", { ...mutation, schema: routeSchema("Create a transport stop") }, async (request, reply) => { const user = requireApiPermission(request, "transport:create"); const input = parseApiBody(transportStopSchema, request.body); const row = await createTransportStop(user, input); await auditCommand(user, { action: "create", module: "transport", entityType: "stop", entityId: row.id, campusId: row.campusId, after: { name: row.name } }); return apiCreated(reply, request, { id: row.id }); });
  app.post<{ Body: unknown }>("/transport/allocations", { ...mutation, schema: routeSchema("Allocate a student to transport") }, async (request, reply) => { const user = requireApiPermission(request, "transport:update"); const input = parseApiBody(routeAllocationSchema, request.body); const row = await allocateStudentToRoute(user, input); await auditCommand(user, { action: "create", module: "transport", entityType: "route_allocation", entityId: row.id, campusId: row.campusId, after: input }); return apiCreated(reply, request, { id: row.id }); });

  app.get("/hostel/rooms", authenticated, async (request) => apiSuccess(request, await listHostelRooms(requireApiPermission(request, "hostel:read"))));
  app.get("/hostel/beds", authenticated, async (request) => apiSuccess(request, await listHostelBeds(requireApiPermission(request, "hostel:read"))));
  app.get("/hostel/students", authenticated, async (request) => apiSuccess(request, await listHostelStudents(requireApiPermission(request, "hostel:read"))));
  app.get("/hostel/allotments", authenticated, async (request) => apiSuccess(request, await listHostelAllotments(requireApiPermission(request, "hostel:read"))));
  app.post<{ Body: unknown }>("/hostel/rooms", { ...mutation, schema: routeSchema("Create a hostel room") }, async (request, reply) => { const user = requireApiPermission(request, "hostel:create"); const row = await createHostelRoom(user, parseApiBody(hostelRoomSchema, request.body)); await auditCommand(user, { action: "create", module: "hostel", entityType: "hostel_room", entityId: row.id, campusId: row.campusId, after: { building: row.building, roomNumber: row.roomNumber, capacity: row.capacity } }); return apiCreated(reply, request, { id: row.id }); });
  app.post<{ Body: unknown }>("/hostel/beds", { ...mutation, schema: routeSchema("Create a hostel bed") }, async (request, reply) => { const user = requireApiPermission(request, "hostel:create"); const row = await createHostelBed(user, parseApiBody(hostelBedSchema, request.body)); await auditCommand(user, { action: "create", module: "hostel", entityType: "hostel_bed", entityId: row.id, campusId: row.campusId, after: { code: row.code, roomId: row.referenceId } }); return apiCreated(reply, request, { id: row.id }); });
  app.post<{ Body: unknown }>("/hostel/allotments", { ...mutation, schema: routeSchema("Allocate a hostel bed") }, async (request, reply) => { const user = requireApiPermission(request, "hostel:update"); const row = await allocateHostelBed(user, parseApiBody(hostelAllotmentSchema, request.body)); await auditCommand(user, { action: "create", module: "hostel", entityType: "hostel_allotment", entityId: row.id, campusId: row.campusId, after: { roomId: row.roomId, bedId: row.bedId, studentId: row.studentId } }); return apiCreated(reply, request, { id: row.id }); });
  app.post<{ Params: IdParams }>("/hostel/allotments/:id/checkout", mutation, async (request) => { const user = requireApiPermission(request, "hostel:update"); const row = await checkoutHostelAllotment(user, parseApiBody(checkoutSchema, { allotmentId: request.params.id }).allotmentId); await auditCommand(user, { action: "update", module: "hostel", entityType: "hostel_allotment", entityId: row.id, campusId: row.campusId, after: { status: row.status, checkedOutOn: row.checkedOutOn?.toISOString() } }); return apiSuccess(request, { id: row.id }); });

  app.get("/canteen/menu", authenticated, async (request) => apiSuccess(request, await listMenus(requireApiPermission(request, "canteen:read"))));
  app.get("/canteen/students", authenticated, async (request) => apiSuccess(request, await listCanteenStudents(requireApiPermission(request, "canteen:read"))));
  app.get("/canteen/transactions", authenticated, async (request) => apiSuccess(request, await listCanteenTransactions(requireApiPermission(request, "canteen:read"))));
  app.post<{ Body: unknown }>("/canteen/menu", { ...mutation, schema: routeSchema("Create a canteen menu item") }, async (request, reply) => { const user = requireApiPermission(request, "canteen:create"); const input = parseApiBody(menuSchema, request.body); const row = await createMenu(user, input); await auditCommand(user, { action: "create", module: "canteen", entityType: "mess_menu", entityId: row.id, campusId: row.campusId, after: { name: row.name } }); return apiCreated(reply, request, { id: row.id }); });
  app.post<{ Body: unknown }>("/canteen/transactions", { ...mutation, schema: routeSchema("Record a canteen transaction") }, async (request, reply) => { const user = requireApiPermission(request, "canteen:update"); const input = parseApiBody(canteenTransactionSchema, request.body); const row = await createCanteenTransaction(user, input); await auditCommand(user, { action: "create", module: "canteen", entityType: "canteen_transaction", entityId: row.id, campusId: row.campusId, after: { menuId: input.menuId, studentId: input.studentId, quantity: input.quantity } }); return apiCreated(reply, request, { id: row.id }); });
};
