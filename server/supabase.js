// Apeiron Solutions — Supabase Cloud Database Adapter
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'node:crypto';

export function createSupabaseClient(env = process.env) {
  const url = env.SUPABASE_URL || '';
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSupabaseDb(client, log = console.log) {
  let cachedIpSalt = null;
  const getNextId = async table => {
    try {
      const { data } = await client.from(table).select('id').order('id', { ascending: false }).limit(1);
      return data && data[0] && Number(data[0].id) ? Number(data[0].id) + 1 : 1;
    } catch (_) {
      return undefined;
    }
  };

  const db = {
    type: 'supabase',
    client,

    async getIpSalt() {
      if (cachedIpSalt) return cachedIpSalt;
      try {
        const { data, error } = await client.from('meta').select('v').eq('k', 'ip_salt').maybeSingle();
        if (data && data.v) {
          cachedIpSalt = data.v;
          return cachedIpSalt;
        }
        const newSalt = randomBytes(32).toString('hex');
        await client.from('meta').upsert({ k: 'ip_salt', v: newSalt });
        cachedIpSalt = newSalt;
        return newSalt;
      } catch (err) {
        log(JSON.stringify({ level: 'error', msg: 'failed to fetch ip_salt from Supabase', err: String(err) }));
        const fallbackSalt = randomBytes(32).toString('hex');
        cachedIpSalt = fallbackSalt;
        return fallbackSalt;
      }
    },

    async audit(actor, action, target = '') {
      try {
        await client.from('audit_log').insert({
          id: await getNextId('audit_log'),
          ts: Date.now(),
          actor: String(actor),
          action: String(action),
          target: String(target || ''),
        });
      } catch (err) {
        log(JSON.stringify({ level: 'warn', msg: 'audit_log insert failed in Supabase', err: String(err) }));
      }
    },

    // ---------------- Users (Admin) ----------------
    users: {
      async getByEmail(email) {
        const { data, error } = await client.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle();
        if (error) throw error;
        return data || null;
      },
      async getById(id) {
        const { data, error } = await client.from('users').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data || null;
      },
      async count() {
        const { count, error } = await client.from('users').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return count || 0;
      },
      async create({ email, pass_hash, role = 'admin', created_at = Date.now() }) {
        const nextId = await getNextId('users');
        const { data, error } = await client.from('users').insert({
          id: nextId,
          email: email.toLowerCase(),
          pass_hash,
          role,
          created_at,
          failed: 0,
          locked_until: 0,
        }).select().single();
        if (error) throw error;
        return data;
      },
      async updateLockout(id, failed, locked_until) {
        const { error } = await client.from('users').update({ failed, locked_until }).eq('id', id);
        if (error) throw error;
      },
      async resetLockout(id) {
        const { error } = await client.from('users').update({ failed: 0, locked_until: 0 }).eq('id', id);
        if (error) throw error;
      },
      async updatePassword(email, pass_hash) {
        const { error } = await client.from('users').update({ pass_hash, failed: 0, locked_until: 0 }).eq('email', email.toLowerCase());
        if (error) throw error;
      },
    },

    // ---------------- Sessions (Admin) ----------------
    sessions: {
      async create({ id, user_id, csrf, created_at, expires_at, last_seen }) {
        // rotation: delete previous sessions for this user
        await client.from('sessions').delete().eq('user_id', user_id);
        const { data, error } = await client.from('sessions').insert({
          id, user_id, csrf, created_at, expires_at, last_seen,
        }).select().single();
        if (error) throw error;
        return data;
      },
      async get(id) {
        const { data, error } = await client.from('sessions').select('*, users!inner(email, role)').eq('id', id).maybeSingle();
        if (error || !data) return null;
        return {
          id: data.id,
          user_id: data.user_id,
          csrf: data.csrf,
          created_at: data.created_at,
          expires_at: data.expires_at,
          last_seen: data.last_seen,
          email: data.users?.email || '',
          role: data.users?.role || 'admin',
        };
      },
      async touch(id, last_seen = Date.now()) {
        await client.from('sessions').update({ last_seen }).eq('id', id);
      },
      async delete(id) {
        await client.from('sessions').delete().eq('id', id);
      },
      async deleteByUserId(user_id) {
        await client.from('sessions').delete().eq('user_id', user_id);
      },
    },

    // ---------------- Enquiries ----------------
    enquiries: {
      async create({ created_at = Date.now(), idea, name, email, company = '', phone = '', status = 'new', notes = '', ip_hash = '', consent = 1, source = 'form' }) {
        const id = await getNextId('enquiries');
        const { data, error } = await client.from('enquiries').insert({
          id, created_at, idea, name, email, company, phone, status, notes, ip_hash, consent, source,
        }).select('id').single();
        if (error) throw error;
        return data;
      },
      async list({ status, search, limit = 50, offset = 0 } = {}) {
        let query = client.from('enquiries').select('*', { count: 'exact' });
        if (status) query = query.eq('status', status);
        if (search) {
          const s = search.replace(/[%_,]/g, '');
          query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%,idea.ilike.%${s}%`);
        }
        const { data, count, error } = await query.order('id', { ascending: false }).range(offset, offset + limit - 1);
        if (error) throw error;
        return { rows: data || [], total: count || 0 };
      },
      async listAllBrief() {
        const { data, error } = await client.from('enquiries').select('id,created_at,name,email,company,phone,status,idea').order('id', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      async get(id) {
        const { data, error } = await client.from('enquiries').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data || null;
      },
      async update(id, { status, notes }) {
        const updates = {};
        if (status !== undefined) updates.status = status;
        if (notes !== undefined) updates.notes = notes;
        const { error } = await client.from('enquiries').update(updates).eq('id', id);
        if (error) throw error;
      },
      async delete(id) {
        const { error, count } = await client.from('enquiries').delete({ count: 'exact' }).eq('id', id);
        if (error) throw error;
        return count > 0;
      },
      async deleteByEmail(email) {
        const { count, error } = await client.from('enquiries').delete({ count: 'exact' }).eq('email', email.toLowerCase());
        if (error) throw error;
        return count || 0;
      },
    },

    // ---------------- Clients ----------------
    clients: {
      async getByEmail(email) {
        const { data, error } = await client.from('clients').select('*').eq('email', email.toLowerCase()).maybeSingle();
        if (error) throw error;
        return data || null;
      },
      async getById(id) {
        const { data, error } = await client.from('clients').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data || null;
      },
      async create({ email, name, pass_hash = '', terms_version = '', terms_at = 0, consent_at = Date.now(), created_at = Date.now() }) {
        const id = await getNextId('clients');
        const { data, error } = await client.from('clients').insert({
          id,
          email: email.toLowerCase(),
          name,
          pass_hash,
          terms_version,
          terms_at,
          consent_at,
          created_at,
          failed: 0,
          locked_until: 0,
        }).select().single();
        if (error) throw error;
        return data;
      },
      async updateLockout(id, failed, locked_until) {
        const { error } = await client.from('clients').update({ failed, locked_until }).eq('id', id);
        if (error) throw error;
      },
      async resetLockout(id) {
        const { error } = await client.from('clients').update({ failed: 0, locked_until: 0 }).eq('id', id);
        if (error) throw error;
      },
      async updateTerms(id, terms_version, terms_at = Date.now()) {
        const { error } = await client.from('clients').update({ terms_version, terms_at }).eq('id', id);
        if (error) throw error;
      },
      async updateProfile(id, { name, company, phone }) {
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (company !== undefined) updates.company = company;
        if (phone !== undefined) updates.phone = phone;
        const { error } = await client.from('clients').update(updates).eq('id', id);
        if (error) throw error;
      },
      async updatePassword(email, pass_hash) {
        const { error } = await client.from('clients').update({ pass_hash }).eq('email', email.toLowerCase());
        if (error) throw error;
      },
      async delete(id) {
        const { count, error } = await client.from('clients').delete({ count: 'exact' }).eq('id', id);
        if (error) throw error;
        return count > 0;
      },
      async deleteByEmail(email) {
        const { count, error } = await client.from('clients').delete({ count: 'exact' }).eq('email', email.toLowerCase());
        if (error) throw error;
        return count || 0;
      },
    },

    // ---------------- Login Codes ----------------
    loginCodes: {
      async get(email) {
        const { data, error } = await client.from('login_codes').select('*').eq('email', email.toLowerCase()).maybeSingle();
        if (error) throw error;
        return data || null;
      },
      async upsert({ email, code_hash, expires_at, attempts = 0, name = '', consent = 0 }) {
        const { error } = await client.from('login_codes').upsert({
          email: email.toLowerCase(),
          code_hash,
          expires_at,
          attempts,
          name,
          consent,
        });
        if (error) throw error;
      },
      async updateAttempts(email, attempts) {
        const { error } = await client.from('login_codes').update({ attempts }).eq('email', email.toLowerCase());
        if (error) throw error;
      },
      async delete(email) {
        const { error } = await client.from('login_codes').delete().eq('email', email.toLowerCase());
        if (error) throw error;
      },
    },

    // ---------------- Client Sessions (csessions) ----------------
    csessions: {
      async create({ id, client_id, csrf, created_at, expires_at, last_seen }) {
        await client.from('csessions').delete().eq('client_id', client_id).lt('expires_at', Date.now());
        const { data, error } = await client.from('csessions').insert({
          id, client_id, csrf, created_at, expires_at, last_seen,
        }).select().single();
        if (error) throw error;
        return data;
      },
      async get(id) {
        const { data, error } = await client.from('csessions').select('*, clients!inner(email, name, company, phone)').eq('id', id).maybeSingle();
        if (error || !data) return null;
        return {
          id: data.id,
          client_id: data.client_id,
          csrf: data.csrf,
          created_at: data.created_at,
          expires_at: data.expires_at,
          last_seen: data.last_seen,
          email: data.clients?.email || '',
          name: data.clients?.name || '',
          company: data.clients?.company || '',
          phone: data.clients?.phone || '',
        };
      },
      async touch(id, last_seen = Date.now()) {
        await client.from('csessions').update({ last_seen }).eq('id', id);
      },
      async delete(id) {
        await client.from('csessions').delete().eq('id', id);
      },
      async deleteByClientId(client_id) {
        await client.from('csessions').delete().eq('client_id', client_id);
      },
    },

    // ---------------- Quotes ----------------
    quotes: {
      async create({ client_id, idea, name, company = '', phone = '', services = '[]', reqs = '{}', notes = '{}', plan = '', build_total = 0, monthly = 0, negotiation = '', status = 'draft', project_status = 'received', consent = 1, created_at = Date.now(), updated_at = Date.now() }) {
        const id = await getNextId('quotes');
        const { data, error } = await client.from('quotes').insert({
          id, client_id, idea, name, company, phone, services, reqs, notes, plan, build_total, monthly, negotiation, status, project_status, consent, created_at, updated_at,
        }).select('id').single();
        if (error) throw error;
        return data;
      },
      async listByClient(client_id, limit = 50) {
        const { data, error } = await client.from('quotes').select('*').eq('client_id', client_id).order('id', { ascending: false }).limit(limit);
        if (error) throw error;
        return data || [];
      },
      async getByIdAndClient(id, client_id) {
        const { data, error } = await client.from('quotes').select('*').eq('id', id).eq('client_id', client_id).maybeSingle();
        if (error) throw error;
        return data || null;
      },
      async getById(id) {
        const { data, error } = await client.from('quotes').select('*, clients!inner(email)').eq('id', id).maybeSingle();
        if (error || !data) return null;
        return {
          ...data,
          email: data.clients?.email || '',
        };
      },
      async update(id, fields) {
        const { error } = await client.from('quotes').update(fields).eq('id', id);
        if (error) throw error;
      },
      async listForAdmin(limit = 100) {
        const { data, error } = await client.from('quotes').select('*, clients!inner(email, name, company, phone)').order('id', { ascending: false }).limit(limit);
        if (error) throw error;
        return (data || []).map(r => ({
          ...r,
          email: r.clients?.email || '',
          cname: r.clients?.name || '',
          ccompany: r.clients?.company || '',
          cphone: r.clients?.phone || '',
        }));
      },
    },

    // ---------------- Quote Comments ----------------
    quoteComments: {
      async listByQuote(quote_id) {
        const { data, error } = await client.from('quote_comments').select('author, message, created_at').eq('quote_id', quote_id).order('id', { ascending: true });
        if (error) throw error;
        return data || [];
      },
      async create({ quote_id, author, message, created_at = Date.now() }) {
        const id = await getNextId('quote_comments');
        const { data, error } = await client.from('quote_comments').insert({
          id, quote_id, author, message, created_at,
        }).select().single();
        if (error) throw error;
        return data;
      },
    },

    // ---------------- Maintenance & Purge ----------------
    async purge(retentionDays = 365) {
      const now = Date.now();
      const cutoff = now - retentionDays * 86400e3;
      try {
        await client.from('enquiries').delete().lt('created_at', cutoff);
        await client.from('sessions').delete().lt('expires_at', now);
        await client.from('csessions').delete().lt('expires_at', now);
        await client.from('login_codes').delete().lt('expires_at', now);
        await client.from('quotes').delete().lt('created_at', cutoff);
      } catch (err) {
        log(JSON.stringify({ level: 'warn', msg: 'purge failed on Supabase', err: String(err) }));
      }
    },

    async ping() {
      const { data, error } = await client.from('meta').select('k').limit(1);
      if (error) throw error;
      return true;
    },

    async close() {
      // Supabase JS HTTP client doesn't need explicit socket close
      return Promise.resolve();
    },
  };

  return db;
}
