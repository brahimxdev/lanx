import { ClientController } from "./clients.controller.js";
import { clientRepo } from "./clients.repo.js";
import { ClientService } from "./clients.service.js";

export const clientService = new ClientService(clientRepo);

export const clientController = new ClientController(clientService);
