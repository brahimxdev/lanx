import { requireAuth } from "@/middlewares/requireAuth.js";
import { validateRequest } from "@/middlewares/validateRequest.js";
import { Router } from "express";
import {
  createClientSchema,
  getClientSchema,
  listclientsSchema,
  updateClientSchema,
} from "./clients.validation.js";
import {
  asyncBodyHandler,
  asyncParamsAndBodyHandler,
  asyncParamsHandler,
  asyncQueryHandler,
} from "@/utils/asyncHandler.js";
import { clientController } from "./clients.module.js";

export const clientsRouter = Router();

//* base url - /api/v1/clients

// apply requireAuth to all clients routes
clientsRouter.use(requireAuth);

// Route for creating clients
clientsRouter.post(
  "/",
  validateRequest({ body: createClientSchema }),
  asyncBodyHandler(clientController.createClient)
);

// Route for listing clients
clientsRouter.get(
  "/",
  validateRequest({ query: listclientsSchema }),
  asyncQueryHandler(clientController.listClients)
);

// Route for viewing single client
clientsRouter.get(
  "/:clientId",
  validateRequest({ params: getClientSchema }),
  asyncParamsHandler(clientController.getClientById)
);

// Route for updating a single client
clientsRouter.patch(
  "/:clientId",
  validateRequest({ params: getClientSchema, body: updateClientSchema }),
  asyncParamsAndBodyHandler(clientController.updateClient)
);

// Route for deleting (archive) a single client
clientsRouter.delete(
  "/:clientId",
  validateRequest({ params: getClientSchema }),
  asyncParamsHandler(clientController.archiveClient)
);
