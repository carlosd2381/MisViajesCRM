import type { ClientRepository } from '../domain/client-repository';
import type { Client, ClientAddress, ClientContact } from '../domain/client';
import { pgQuery } from '../../../core/db/pg-client';

interface ClientRow {
  id: string;
  lead_id: string | null;
  first_name: string;
  middle_name: string | null;
  paternal_last_name: string;
  maternal_last_name: string | null;
  gender: string | null;
  birth_date: string | null;
  anniversary_date: string | null;
  company_name: string | null;
  job_title: string | null;
  website: string | null;
  travel_preferences_json: Record<string, string | number | boolean | string[]>;
  created_at: string;
  updated_at: string;
}

interface ContactRow {
  contact_type: ClientContact['type'];
  contact_value: string;
}

interface AddressRow {
  address_type: ClientAddress['type'];
  street_1: string;
  street_2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

function mapClientRow(row: ClientRow, contacts: ClientContact[], addresses: ClientAddress[]): Client {
  return {
    id: row.id,
    leadId: row.lead_id ?? undefined,
    firstName: row.first_name,
    middleName: row.middle_name ?? undefined,
    paternalLastName: row.paternal_last_name,
    maternalLastName: row.maternal_last_name ?? undefined,
    gender: row.gender ?? undefined,
    birthDate: row.birth_date ?? undefined,
    anniversaryDate: row.anniversary_date ?? undefined,
    companyName: row.company_name ?? undefined,
    jobTitle: row.job_title ?? undefined,
    website: row.website ?? undefined,
    contacts,
    addresses,
    travelPreferences: row.travel_preferences_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function loadContacts(clientId: string): Promise<ClientContact[]> {
  const sql = 'select contact_type, contact_value from client_contacts where client_id = $1 order by created_at asc';
  const result = await pgQuery<ContactRow>(sql, [clientId]);

  return result.rows.map((row: ContactRow) => ({ type: row.contact_type, value: row.contact_value }));
}

async function loadAddresses(clientId: string): Promise<ClientAddress[]> {
  const sql = 'select address_type, street_1, street_2, city, state, zip_code, country from client_addresses where client_id = $1 order by created_at asc';
  const result = await pgQuery<AddressRow>(sql, [clientId]);

  return result.rows.map((row: AddressRow) => ({
    type: row.address_type,
    street1: row.street_1,
    street2: row.street_2 ?? undefined,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    country: row.country
  }));
}

async function replaceContacts(clientId: string, contacts: ClientContact[]): Promise<void> {
  await pgQuery('delete from client_contacts where client_id = $1', [clientId]);

  for (const contact of contacts) {
    const sql = 'insert into client_contacts (client_id, contact_type, contact_value) values ($1, $2, $3)';
    await pgQuery(sql, [clientId, contact.type, contact.value]);
  }
}

async function replaceAddresses(clientId: string, addresses: ClientAddress[]): Promise<void> {
  await pgQuery('delete from client_addresses where client_id = $1', [clientId]);

  for (const address of addresses) {
    const sql = `
      insert into client_addresses (client_id, address_type, street_1, street_2, city, state, zip_code, country)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const params = [
      clientId,
      address.type,
      address.street1,
      address.street2 ?? null,
      address.city,
      address.state,
      address.zipCode,
      address.country
    ];

    await pgQuery(sql, params);
  }
}

export class PostgresClientRepository implements ClientRepository {
  async list(): Promise<Client[]> {
    const result = await pgQuery<ClientRow>('select * from clients order by created_at desc');
    const data: Client[] = [];

    for (const row of result.rows) {
      const contacts = await loadContacts(row.id);
      const addresses = await loadAddresses(row.id);
      data.push(mapClientRow(row, contacts, addresses));
    }

    return data;
  }

  async getById(id: string): Promise<Client | null> {
    const result = await pgQuery<ClientRow>('select * from clients where id = $1', [id]);
    const row = result.rows[0];
    if (!row) return null;

    const contacts = await loadContacts(row.id);
    const addresses = await loadAddresses(row.id);
    return mapClientRow(row, contacts, addresses);
  }

  async getByLeadId(leadId: string): Promise<Client | null> {
    const result = await pgQuery<ClientRow>('select * from clients where lead_id = $1', [leadId]);
    const row = result.rows[0];
    if (!row) return null;

    const contacts = await loadContacts(row.id);
    const addresses = await loadAddresses(row.id);
    return mapClientRow(row, contacts, addresses);
  }

  async create(entity: Client): Promise<Client> {
    const sql = `
      insert into clients (
        id, lead_id, first_name, middle_name, paternal_last_name, maternal_last_name,
        gender, birth_date, anniversary_date, company_name, job_title, website,
        travel_preferences_json, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      ) returning *
    `;

    const params = [
      entity.id,
      entity.leadId ?? null,
      entity.firstName,
      entity.middleName ?? null,
      entity.paternalLastName,
      entity.maternalLastName ?? null,
      entity.gender ?? null,
      entity.birthDate ?? null,
      entity.anniversaryDate ?? null,
      entity.companyName ?? null,
      entity.jobTitle ?? null,
      entity.website ?? null,
      entity.travelPreferences,
      entity.createdAt,
      entity.updatedAt
    ];

    const result = await pgQuery<ClientRow>(sql, params);
    await replaceContacts(entity.id, entity.contacts);
    await replaceAddresses(entity.id, entity.addresses);

    return mapClientRow(result.rows[0], entity.contacts, entity.addresses);
  }

  async update(entity: Client): Promise<Client> {
    const sql = `
      update clients set
        lead_id = $2,
        first_name = $3,
        middle_name = $4,
        paternal_last_name = $5,
        maternal_last_name = $6,
        gender = $7,
        birth_date = $8,
        anniversary_date = $9,
        company_name = $10,
        job_title = $11,
        website = $12,
        travel_preferences_json = $13,
        updated_at = $14
      where id = $1
      returning *
    `;

    const params = [
      entity.id,
      entity.leadId ?? null,
      entity.firstName,
      entity.middleName ?? null,
      entity.paternalLastName,
      entity.maternalLastName ?? null,
      entity.gender ?? null,
      entity.birthDate ?? null,
      entity.anniversaryDate ?? null,
      entity.companyName ?? null,
      entity.jobTitle ?? null,
      entity.website ?? null,
      entity.travelPreferences,
      entity.updatedAt
    ];

    const result = await pgQuery<ClientRow>(sql, params);
    await replaceContacts(entity.id, entity.contacts);
    await replaceAddresses(entity.id, entity.addresses);

    return mapClientRow(result.rows[0], entity.contacts, entity.addresses);
  }
}
