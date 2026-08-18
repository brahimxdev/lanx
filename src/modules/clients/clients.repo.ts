import type { Executor } from "@/db/executor.js";
import type { IClientRepo, Client, CreateClientInput } from "./clientsRepo.Interface.js";
import { db } from "@/db/client.js";
import { clients } from "@/db/schema/index.js";
import { AppError } from "@/errors/AppError.js";
import type { IListClients } from "./clients.validation.js";
import { paginate, toOffset, type Paginated } from "@/shared/pagination/index.js";
import { and, asc, desc, eq, ilike, isNull, sql } from "drizzle-orm";

export class ClientRepo implements IClientRepo {
  // Create client record, if email already exist don't duplicate per freelancer
  async createClient(
    data: CreateClientInput,
    authUserId: string,
    executor: Executor = db
  ): Promise<Client> {
    const [clientRecord] = await executor
      .insert(clients)
      .values({ ...data, authUserId })
      .returning();

    if (!clientRecord) {
      throw AppError.internalServerError("Failed to create client");
    }
    return clientRecord;
  }

  // List clients for a freelancer with pagination, sorting, and filtration
  async findManyByAuthUserId(
    queryParams: IListClients,
    authUserId: string,
    executor: Executor = db
  ): Promise<Paginated<Client>> {
    const { page, limit, search, sortBy, sortOrder, isIncludedArchived } = queryParams;

    const offset = toOffset(page, limit);

    const conditions = [eq(clients.authUserId, authUserId)];

    if (isIncludedArchived === "false") {
      conditions.push(isNull(clients.archivedAt));
    }

    if (search) {
      conditions.push(
        sql`(${ilike(clients.firstName, `%${search}%`)} OR ${ilike(clients.lastName, `%${search}%`)} OR ${ilike(clients.email, `%${search}%`)} OR ${ilike(clients.companyName, `%${search}%`)})`
      );
    }

    const whereCondition = and(...conditions);

    const sortColumnMap: Record<IListClients["sortBy"], typeof clients.createdAt> = {
      createdAt: clients.createdAt,
    };

    const sortColumn = sortColumnMap[sortBy];
    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      executor
        .select()
        .from(clients)
        .where(whereCondition)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset(offset),

      executor
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
        .where(whereCondition),
    ]);

    const total = countResult[0]?.count ?? 0;

    return paginate(data, page, limit, total);
  }

  // Find a client by ID for a specific freelancer
  async findById(
    clientId: string,
    authUserId: string,
    executor: Executor = db
  ): Promise<Client | null> {
    const [clientRecord] = await executor
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.authUserId, authUserId)));

    return clientRecord ?? null;
  }
}

export const clientRepo = new ClientRepo();
