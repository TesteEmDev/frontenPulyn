--
-- PostgreSQL database dump
--

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone',
    'recovery_code'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'like',
    'ilike',
    'is',
    'match',
    'imatch',
    'isdistinct'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text,
	negate boolean
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
    revoke trigger on cron.job_run_details from postgres;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
begin
    if not exists (
        select 1
        from pg_catalog.pg_event_trigger_ddl_commands() ev
        join pg_catalog.pg_extension e on ev.objid = e.oid
        where e.extname = 'pg_graphql'
    ) then
        return;
    end if;

    drop function if exists graphql_public.graphql;
    create or replace function graphql_public.graphql(
        "operationName" text default null,
        query text default null,
        variables jsonb default null,
        extensions jsonb default null
    )
        returns jsonb
        language sql
    as $$
        select graphql.resolve(
            query := query,
            variables := coalesce(variables, '{}'),
            "operationName" := "operationName",
            extensions := extensions
        );
    $$;

    -- Attach the wrapper to the extension so DROP EXTENSION cascades to it,
    -- which in turn triggers set_graphql_placeholder to reinstall the "not enabled" stub.
    alter extension pg_graphql add function graphql_public.graphql(text, text, jsonb, jsonb);

    grant usage on schema graphql to postgres, anon, authenticated, service_role;
    grant execute on function graphql.resolve to postgres, anon, authenticated, service_role;
    grant usage on schema graphql to postgres with grant option;
    grant usage on schema graphql_public to postgres with grant option;
end;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8.0', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
            set search_path to ''
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: -
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    -- Reset the role on every FOR..LOOP batch execution.
                    -- The first batch of 10 rows is pre-fetched using the current connection role (PG internal behaviour)
                    -- then we have to reset it again otherwise it would use the role defined in the `set_config` above
                    -- to fetch the remaining rows when rows>10, which could be a user-defined role that lacks execution grants.
                    -- The flow is:
                    --   1. run batch with conn role
                    --   2. set_config working_role
                    --   3. execute walrus
                    --   4. reset role (revert)
                    --   5. repeat
                    perform set_config('role', null, true);

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select
        filters is null
        or array_length(filters, 1) is null
        or coalesce(
            count(col.name) = count(1)
            and sum(
                realtime.check_equality_op(
                    op:=f.op,
                    type_:=coalesce(col.type_oid::regtype, col.type_name::regtype),
                    val_1:=col.value #>> '{}',
                    val_2:=f.value,
                    negate:=coalesce(f.negate, false)
                )::int
            ) filter (where col.name is not null) = count(col.name),
            false
        )
    from
        unnest(filters) f
        left join unnest(columns) col
            on f.column_name = col.name;
$$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- Name: list_changes_sync(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes_sync(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures the slot is read exactly once.
  consumed AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         realtime.settled_changes(
           slot_name, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM consumed
    WHERE consumed.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM consumed,
         realtime.apply_rls(
           wal := consumed.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE consumed.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT
    realtime.wal2json_escape_identifier(nsp.nspname::text)
    || '.'
    || realtime.wal2json_escape_identifier(pc.relname::text)
  FROM pg_class pc
  JOIN pg_namespace nsp ON pc.relnamespace = nsp.oid
  WHERE pc.oid = entity
$$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: send_binary(bytea, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, binary_payload, event, topic, private, extension)
    VALUES (generated_id, payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: settled_changes(name, integer, text[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.settled_changes(slot_name name, max_changes integer, VARIADIC opts text[]) RETURNS TABLE(lsn pg_lsn, xid xid, data text)
    LANGUAGE plpgsql
    AS $$
declare
  upto pg_lsn;
  total bigint;
  xids xid[];
  starts bigint[];
  snapshot pg_snapshot;
  running_xids xid[];
  xmax_age int;
  cut bigint;
begin
  -- Each statement in a volatile function takes its own snapshot, which is what lets the
  -- check below see a writer that was still in flight when the peek ran. Under REPEATABLE
  -- READ the snapshot never advances, so a deferred change would never be released.
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'realtime.settled_changes requires READ COMMITTED';
  end if;

  -- The peek and the read below cover the same WAL, so the read cannot reach a commit the
  -- check never saw.
  upto := pg_current_wal_flush_lsn();

  -- One entry per transaction, in commit order: its xid and the position of its first
  -- change. The peek uses the caller's own options, so max_changes counts exactly what the
  -- read counts. A non-transactional logical message is emitted as soon as it is decoded,
  -- tagged with the xid of whatever transaction wrote it, so it does not mark where that
  -- transaction starts.
  select coalesce(sum(g.n), 0),
         array_agg(g.x order by g.first) filter (where g.first is not null),
         array_agg(g.first order by g.first) filter (where g.first is not null)
    into total, xids, starts
    from (
      select p.xid as x, count(*) as n,
             min(p.ord) filter (where not case
               when starts_with(p.data, '{"action":"M"') then (p.data::jsonb->>'transactional')::boolean is false
               else false
             end) as first
      from pg_logical_slot_peek_changes(slot_name, upto, max_changes, variadic opts)
           with ordinality as p(lsn, xid, data, ord)
      group by p.xid
    ) g;

  -- Nothing for the caller, but the slot still has to move past what the peek covered.
  if total = 0 then
    perform pg_replication_slot_advance(slot_name, upto);
    return;
  end if;

  if xids is not null then
    -- Taken after the peek is materialized, so a writer that was still in flight during
    -- decoding is guaranteed to show up here.
    snapshot := pg_current_snapshot();

    -- A commit record reaches the WAL before the writer leaves the proc array, so a change
    -- can be decoded while its row is invisible. apply_rls would resolve a policy against a
    -- row it cannot see and authorize it for nobody, while the read consumed it regardless.
    --
    -- xip lists transactions running when the snapshot was taken. It does not cover a writer
    -- whose xid sits at or beyond xmax, which never appears there, so the horizon is checked
    -- too. age() counts backwards from the current xid and so compares correctly across
    -- wraparound.
    select coalesce(array_agg(running.x::xid), array[]::xid[])
      into running_xids
      from pg_snapshot_xip(snapshot) running(x);
    xmax_age := age(pg_snapshot_xmax(snapshot)::xid);

    select min(u.s) into cut
      from unnest(xids, starts) as u(x, s)
      where u.x = any(running_xids) or age(u.x) <= xmax_age;
  end if;

  -- The read stops right after the commit that brings its count to upto_nchanges, so the
  -- count of changes in front of the first unsettled transaction stops it just before that
  -- transaction.
  if cut is null then
    return query
      select p.* from pg_logical_slot_get_changes(slot_name, upto, max_changes, variadic opts) p;
  elsif cut > 1 then
    return query
      select p.* from pg_logical_slot_get_changes(slot_name, upto, (cut - 1)::int, variadic opts) p;
  end if;
end;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    col_names text[] = coalesce(
            array_agg(a.attname order by a.attnum),
            '{}'::text[]
        )
        from
            pg_catalog.pg_attribute a
        where
            a.attrelid = new.entity
            and a.attnum > 0
            and not a.attisdropped
            and pg_catalog.has_column_privilege(
                (new.claims ->> 'role'),
                a.attrelid,
                a.attnum,
                'SELECT'
            );
    filter realtime.user_defined_filter;
    col_type regtype;
    in_val jsonb;
    selected_col text;
begin
    for filter in select * from unnest(new.filters) loop
        if not filter.column_name = any(col_names) then
            raise exception 'invalid column for filter %', filter.column_name;
        end if;

        col_type = (
            select atttypid::regtype
            from pg_catalog.pg_attribute
            where attrelid = new.entity
                  and attname = filter.column_name
        );
        if col_type is null then
            raise exception 'failed to lookup type for column %', filter.column_name;
        end if;

        if filter.op = 'in'::realtime.equality_op then
            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
            if coalesce(jsonb_array_length(in_val), 0) > 100 then
                raise exception 'too many values for `in` filter. Maximum 100';
            end if;
        elsif filter.op = 'is'::realtime.equality_op then
            -- `is` requires a keyword RHS rather than a typed literal
            if filter.value not in ('null', 'true', 'false', 'unknown') then
                raise exception 'invalid value for is filter: must be null, true, false, or unknown';
            end if;
            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean
            -- operand. Reject the non-null keywords on non-boolean columns here so they
            -- don't abort apply_rls at WAL time.
            if filter.value <> 'null' and col_type <> 'boolean'::regtype then
                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;
            end if;
        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then
            -- like/ilike apply the text pattern operator (~~); reject column types that
            -- have no such operator instead of failing at WAL time
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = '~~' and oprleft = col_type
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then
            -- match/imatch apply the regex operators ~ / ~*; reject column types that have
            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the
            -- like/ilike guard above.
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end
                  and oprleft = col_type
                  and oprright = col_type
                  and oprresult = 'boolean'::regtype
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
            -- validate the regex eagerly so a bad pattern is rejected here, not inside
            -- apply_rls where it would abort the WAL stream for the entity
            begin
                perform '' ~ filter.value;
            exception when others then
                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;
            end;
        else
            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type
            perform realtime.cast(filter.value, col_type);
        end if;
    end loop;

    if new.selected_columns is not null then
        for selected_col in select * from unnest(new.selected_columns) loop
            if not selected_col = any(col_names) then
                raise exception 'invalid column for select %', selected_col;
            end if;
        end loop;
    end if;

    -- Apply consistent order to filters so the unique constraint can't be tricked by a
    -- different filter order. negate is part of the sort key.
    new.filters = coalesce(
        array_agg(f order by f.column_name, f.op, f.value, f.negate),
        '{}'
    ) from unnest(new.filters) f;

    -- Normalize selected_columns order so ARRAY['a','b'] and ARRAY['b','a'] are treated
    -- as the same subscription group in apply_rls. Preserve an empty array as '{}'
    -- ("primary keys only") so it stays distinct from NULL ("all columns"); array_agg
    -- over an empty set would otherwise collapse '{}' back to NULL.
    if new.selected_columns is not null then
        new.selected_columns = coalesce(
            (
                select array_agg(c order by c)
                from unnest(new.selected_columns) c
            ),
            '{}'::text[]
        );
    end if;

    return new;
end;
$$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: wal2json_escape_identifier(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.wal2json_escape_identifier(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  -- Prefix `\`, `,`, `.`, and any whitespace with `\`
  SELECT regexp_replace(name, '([\\,.[:space:]])', '\\\1', 'g')
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_lifecycle_service_role(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_lifecycle_service_role() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
  IF current_user::text IS DISTINCT FROM TG_ARGV[0]
     AND (
       OLD.lifecycle_configuration IS DISTINCT FROM NEW.lifecycle_configuration
       OR OLD.lifecycle_configuration_generation IS DISTINCT FROM NEW.lifecycle_configuration_generation
     ) THEN
    -- AFTER runs only after caller RLS has accepted the proposed row. The API
    -- recognizes this specific error after rolling back its permission probe;
    -- direct non-service writes still fail and cannot persist the change.
    RAISE EXCEPTION 'bucket control columns may only be changed by the configured storage service role'
      USING ERRCODE = 'PST01',
            SCHEMA = TG_TABLE_SCHEMA,
            TABLE = TG_TABLE_NAME,
            CONSTRAINT = TG_NAME;
  END IF;

  RETURN NULL;
END;
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    RETURN _parts[array_length(_parts, 1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN p_delimiter <> ''
         AND position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(
        p_key,
        length(p_prefix)
            + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1))
            + length(p_delimiter) - 1
    )
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket(noncurrent_versions text DEFAULT 'include'::text, delete_markers text DEFAULT 'include'::text) RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'include');
    delete_markers := COALESCE(delete_markers, 'include');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'include';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'include';
    END IF;

    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        where (noncurrent_versions != 'exclude' OR obj.archived_at IS NULL)
          and (noncurrent_versions != 'only' OR obj.archived_at IS NOT NULL)
          and (delete_markers != 'exclude' OR NOT obj.is_delete_marker)
          and (delete_markers != 'only' OR obj.is_delete_marker)
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text, raw_prefix_param text DEFAULT NULL::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE sql STABLE
    AS $_$
WITH candidates AS (
    SELECT
        upload.key AS object_key,
        CASE
            WHEN position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1)) > 0
            THEN left(
                upload.key,
                length(coalesce($7, $2))
                    + position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1))
                    + length($3) - 1
            )
            ELSE upload.key
        END AS result_key,
        upload.id,
        upload.created_at,
        position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1)) > 0 AS is_common_prefix
    FROM storage.s3_multipart_uploads AS upload
    WHERE upload.bucket_id = $1
      AND upload.key COLLATE "C" LIKE $2 || '%'
), filtered AS (
    SELECT candidate.*
    FROM candidates AS candidate
    WHERE $5 = ''
       OR candidate.result_key COLLATE "C" > $5
       OR (
           candidate.result_key COLLATE "C" = $5
           AND NOT candidate.is_common_prefix
           AND $6 <> ''
           -- A completed or aborted marker repeats the remaining same-key uploads.
           AND COALESCE(
               (candidate.created_at, candidate.id COLLATE "C") > (
                   SELECT marker.created_at, marker.id COLLATE "C"
                   FROM storage.s3_multipart_uploads AS marker
                   WHERE marker.bucket_id = $1
                     AND marker.key COLLATE "C" = $5
                     AND marker.id = $6
               ),
               TRUE
           )
       )
), ranked AS (
    SELECT
        filtered.*,
        row_number() OVER (
            PARTITION BY filtered.result_key COLLATE "C"
            ORDER BY filtered.created_at, filtered.id COLLATE "C"
        ) AS prefix_rank
    FROM filtered
)
SELECT ranked.result_key, ranked.id, ranked.created_at
FROM ranked
WHERE NOT ranked.is_common_prefix OR ranked.prefix_rank = 1
ORDER BY ranked.result_key COLLATE "C", ranked.created_at, ranked.id COLLATE "C"
LIMIT $4;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text, text, text, timestamp with time zone, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text, next_token_archived_at timestamp with time zone DEFAULT NULL::timestamp with time zone, next_token_version text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_start_relative TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;
    v_version_filter TEXT;

    -- true when noncurrent_versions can return >1 row per name; keeps them
    -- ordered most-recent-first and lets pagination resume mid-key
    v_multi_row BOOLEAN;
    v_name_order TEXT;
    v_exact_range_predicate TEXT;
    v_strict_range_predicate TEXT;
    v_inclusive_range_predicate TEXT;

    -- Seek state for the current name. archived_at is normalized to JavaScript's
    -- millisecond precision and version breaks ties within the same millisecond.
    -- Current rows use 'infinity'; NULL means no tiebreak has been established.
    v_next_seek TEXT;
    v_next_seek_at TIMESTAMPTZ;
    v_next_seek_version TEXT;
    v_next_seek_strict BOOLEAN := false;
    v_cursor_is_folder BOOLEAN;
    v_count INT := 0;
    v_previous_seek TEXT;
    v_previous_seek_at TIMESTAMPTZ;
    v_previous_seek_version TEXT;
    v_previous_count INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;
    v_batch_query_strict TEXT;
    v_delete_marker_peek_query TEXT;
    v_delete_marker_peek_query_strict TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);
    v_next_seek_at := NULL;
    v_next_seek_version := '';

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    v_multi_row := noncurrent_versions IN ('only', 'include');
    v_name_order := CASE WHEN v_is_asc THEN 'ASC' ELSE 'DESC' END;

    v_version_filter := '';
    IF noncurrent_versions = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NULL';
    ELSIF noncurrent_versions = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NOT NULL';
    END IF;
    IF delete_markers = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND NOT o.is_delete_marker';
    ELSIF delete_markers = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.is_delete_marker';
    END IF;

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Keep caller-provided cursors inside the requested prefix range.
    IF v_start <> '' AND v_upper_bound IS NOT NULL THEN
        IF v_is_asc THEN
            IF v_start COLLATE "C" < v_prefix COLLATE "C" THEN
                v_start := '';
            ELSIF v_start COLLATE "C" >= v_upper_bound COLLATE "C" THEN
                RETURN;
            END IF;
        ELSE
            IF v_start COLLATE "C" < v_prefix COLLATE "C" THEN
                RETURN;
            ELSIF v_start COLLATE "C" >= v_upper_bound COLLATE "C" THEN
                v_start := '';
            END IF;
        END IF;
    END IF;

    v_start_relative := substring(v_start FROM length(v_prefix) + 1);

    -- Direction affects only the indexed name range and its ordering. Cursor
    -- state transitions and within-key version ordering stay shared.
    IF v_is_asc THEN
        v_exact_range_predicate := 'TRUE';
        v_strict_range_predicate := 'o.name COLLATE "C" > $2';
        v_inclusive_range_predicate := 'o.name COLLATE "C" >= $2';
        IF v_upper_bound IS NOT NULL THEN
            v_exact_range_predicate := 'o.name COLLATE "C" < $3';
            v_strict_range_predicate := v_strict_range_predicate || ' AND o.name COLLATE "C" < $3';
            v_inclusive_range_predicate := v_inclusive_range_predicate || ' AND o.name COLLATE "C" < $3';
        END IF;
    ELSE
        v_exact_range_predicate := 'TRUE';
        v_strict_range_predicate := 'o.name COLLATE "C" < $2';
        v_inclusive_range_predicate := 'o.name COLLATE "C" < $2';
        IF v_prefix <> '' THEN
            v_exact_range_predicate := 'o.name COLLATE "C" >= $3';
            v_strict_range_predicate := v_strict_range_predicate || ' AND o.name COLLATE "C" >= $3';
            v_inclusive_range_predicate := v_inclusive_range_predicate || ' AND o.name COLLATE "C" >= $3';
        END IF;
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    -- The multi-row order matches the externally serialized cursor exactly:
    -- archived_at at millisecond precision, then version as the final tiebreak.
    --
    -- When v_multi_row, the seek is a keyset tuple comparison ("name > $2 OR
    -- (name = $2 AND tiebreak)") - Postgres won't split that OR into indexable
    -- form (confirmed even with fully literal values), so as one WHERE clause
    -- it forces a full bucket scan filtered row-by-row. Splitting it into two
    -- independently-indexable branches (exact name match with the tiebreak
    -- filter, vs. strictly-past names) combined with UNION ALL lets each
    -- branch keep name as a real index condition; the outer ORDER BY/LIMIT
    -- re-merges them into the same page the single query used to produce.
    IF v_multi_row THEN
        v_batch_query := format(
            $sql$
            SELECT *
            FROM (
                (
                    SELECT o.name, o.id, o.updated_at, o.created_at,
                           o.last_accessed_at, o.metadata, o.version,
                           o.archived_at, o.is_delete_marker, o.is_versioned
                    FROM storage.objects o
                    WHERE o.bucket_id = $1
                      AND o.name COLLATE "C" = $2
                      AND %s
                      AND NOT $7::boolean
                      AND (
                          $5::timestamptz IS NULL
                          OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < $5
                          OR (
                              COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = $5
                              AND COALESCE(o.version, '') > $6
                          )
                      )
                      %s
                    ORDER BY
                        COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC,
                        COALESCE(o.version, '') ASC
                    LIMIT $4
                )
                UNION ALL
                (
                    SELECT o.name, o.id, o.updated_at, o.created_at,
                           o.last_accessed_at, o.metadata, o.version,
                           o.archived_at, o.is_delete_marker, o.is_versioned
                    FROM storage.objects o
                    WHERE o.bucket_id = $1
                      AND %s
                      %s
                    ORDER BY
                        o.name COLLATE "C" %s,
                        COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC,
                        COALESCE(o.version, '') ASC
                    LIMIT $4
                )
            ) sub
            ORDER BY
                sub.name COLLATE "C" %s,
                COALESCE(date_trunc('milliseconds', sub.archived_at), 'infinity'::timestamptz) DESC,
                COALESCE(sub.version, '') ASC
            LIMIT $4
            $sql$,
            v_exact_range_predicate,
            v_version_filter,
            v_strict_range_predicate,
            v_version_filter,
            v_name_order,
            v_name_order
        );
    ELSE
        v_batch_query := format(
            $sql$
            SELECT o.name, o.id, o.updated_at, o.created_at,
                   o.last_accessed_at, o.metadata, o.version,
                   o.archived_at, o.is_delete_marker, o.is_versioned
            FROM storage.objects o
            WHERE o.bucket_id = $1
              AND %s
              %s
            ORDER BY o.name COLLATE "C" %s, o.archived_at DESC
            LIMIT $4
            $sql$,
            v_inclusive_range_predicate,
            v_version_filter,
            v_name_order
        );

        -- Strict counterpart of the query above: used once the single-row
        -- ASC batch advance (below) has left v_next_seek pointing at the
        -- last row already emitted, so an inclusive predicate would
        -- re-match it forever. Only single-row mode ever sets strict mode,
        -- so this variant is never needed when v_multi_row.
        v_batch_query_strict := format(
            $sql$
            SELECT o.name, o.id, o.updated_at, o.created_at,
                   o.last_accessed_at, o.metadata, o.version,
                   o.archived_at, o.is_delete_marker, o.is_versioned
            FROM storage.objects o
            WHERE o.bucket_id = $1
              AND %s
              %s
            ORDER BY o.name COLLATE "C" %s, o.archived_at DESC
            LIMIT $4
            $sql$,
            v_strict_range_predicate,
            v_version_filter,
            v_name_order
        );
    END IF;

    -- The static peek predicates cannot use the partial delete-marker index
    -- once PL/pgSQL switches to a generic plan because whether
    -- is_delete_marker is required remains parameter-dependent. Reuse the
    -- already-specialized batch query with a one-row limit for this sparse
    -- filter so the plan sees a literal `o.is_delete_marker` predicate.
    IF delete_markers = 'only' THEN
        v_delete_marker_peek_query :=
            'SELECT marker_page.name FROM (' || v_batch_query || ') marker_page LIMIT 1';
        IF NOT v_multi_row THEN
            v_delete_marker_peek_query_strict :=
                'SELECT marker_page.name FROM (' || v_batch_query_strict || ') marker_page LIMIT 1';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor performs one specialized initial seek so
            -- partial current-version and delete-marker indexes remain available.
            EXECUTE format(
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1%s%s ORDER BY o.name COLLATE "C" DESC LIMIT 1',
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND o.name COLLATE "C" >= $2 AND o.name COLLATE "C" < $3'
                    ELSE ''
                END,
                v_version_filter
            )
            INTO v_next_seek
            USING _bucket_id, v_prefix, v_upper_bound;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Folder continuation tokens retain their trailing delimiter. A
        -- delimiter-less startAfter is always a literal key boundary.
        v_cursor_is_folder := delimiter_param <> ''
            AND v_start_relative <> ''
            AND right(v_start_relative, length(delimiter_param)) = delimiter_param;

        IF v_cursor_is_folder THEN
            v_next_seek := CASE
                WHEN right(v_start, length(delimiter_param)) = delimiter_param
                    THEN v_start
                ELSE v_start || delimiter_param
            END;
            IF v_is_asc THEN
                v_next_seek := left(v_next_seek, -1)
                    || chr(ascii(right(v_next_seek, 1)) + 1);
            END IF;
            v_next_seek_strict := NOT v_is_asc;
        ELSE
            -- leaf object: when v_multi_row, stay on v_start with the
            -- caller-supplied tiebreak so a page boundary mid-key resumes
            -- that key's remaining rows instead of skipping them. Truncate
            -- to milliseconds like every other v_next_seek_at assignment -
            -- harmless today since object.ts's cursor always round-trips
            -- through JS Date first, but this shouldn't rely on that.
            IF v_multi_row THEN
                v_next_seek := v_start;
                v_next_seek_at := date_trunc('milliseconds', next_token_archived_at);
                v_next_seek_version := coalesce(next_token_version, '');
                v_next_seek_strict := coalesce(next_token, '') = '';
            ELSIF v_is_asc THEN
                v_next_seek := v_start;
                v_next_seek_strict := true;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        v_previous_seek := v_next_seek;
        v_previous_seek_at := v_next_seek_at;
        v_previous_seek_version := v_next_seek_version;
        v_previous_count := v_count;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        -- v_multi_row is branched here (rather than folded into the WHERE
        -- clause as a bound parameter) so each concrete query keeps an
        -- unconditional seek predicate - once PL/pgSQL switches to its
        -- cached generic plan (after 5 calls), a parameter-gated
        -- "(NOT v_multi_row AND name >= $x) OR (v_multi_row AND ...)"
        -- predicate stops the planner from using name as an index
        -- condition at all, degrading every subsequent peek to a full
        -- index scan filtered row-by-row instead of a bounded range scan.
        -- v_multi_row's seek predicate is a keyset tuple comparison
        -- ("name > x OR (name = x AND tiebreak)") - Postgres does not
        -- split this OR into indexable form even with fully literal
        -- values, so it falls back to a full scan filtered row-by-row.
        -- Splitting it into two independently-indexable branches (exact
        -- name match with the tiebreak filter, vs. strictly-past name)
        -- combined with UNION ALL lets each branch keep name as a real
        -- index condition; the outer ORDER BY/LIMIT picks whichever of
        -- the (at most 2) rows sorts first.
        IF delete_markers = 'only' THEN
            EXECUTE CASE WHEN v_next_seek_strict AND NOT v_multi_row
                THEN v_delete_marker_peek_query_strict
                ELSE v_delete_marker_peek_query
            END
                INTO v_peek_name
                USING _bucket_id, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END,
                    1, v_next_seek_at, v_next_seek_version, v_next_seek_strict;
        ELSIF v_multi_row THEN
            IF v_is_asc THEN
                IF v_upper_bound IS NOT NULL THEN
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND o.name COLLATE "C" < v_upper_bound
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" > v_next_seek AND o.name COLLATE "C" < v_upper_bound
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" ASC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" > v_next_seek
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" ASC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSE
                IF v_upper_bound IS NOT NULL THEN
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND o.name COLLATE "C" >= v_prefix
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" DESC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" DESC LIMIT 1;
                ELSE
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" DESC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" DESC LIMIT 1;
                END IF;
            END IF;
        ELSE
            -- Single-row mode is always noncurrent_versions='exclude'. Keep
            -- this predicate literal so generic plans use the current index.
            IF v_is_asc THEN
                IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" > v_next_seek
                      AND o.name COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSIF v_next_seek_strict THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" > v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSIF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" >= v_next_seek
                      AND o.name COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" >= v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSE
                IF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" < v_next_seek
                      AND o.name COLLATE "C" >= v_prefix
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" DESC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" < v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" DESC LIMIT 1;
                END IF;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := v_common_prefix;
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            version := NULL;
            archived_at := NULL;
            is_delete_marker := NULL;
            is_versioned := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1)
                    || chr(ascii(right(v_common_prefix, 1)) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
            v_next_seek_at := NULL;
            v_next_seek_version := '';
            v_next_seek_strict := NOT v_is_asc;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE CASE WHEN v_next_seek_strict AND NOT v_multi_row THEN v_batch_query_strict ELSE v_batch_query END
                USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size, v_next_seek_at, v_next_seek_version,
                v_next_seek_strict
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it. Reset
                    -- strict mode too it may have been set by an earlier
                    -- row in this same batch (see the single-row ASC advance
                    -- below), and v_next_seek here is the folder-triggering
                    -- row's own name, which the next peek must find inclusively.
                    v_next_seek := CASE
                        WHEN v_is_asc THEN v_current.name
                        ELSE v_current.name || delimiter_param
                    END;
                    v_next_seek_at := NULL;
                    v_next_seek_version := '';
                    v_next_seek_strict := false;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                version := v_current.version;
                archived_at := v_current.archived_at;
                is_delete_marker := v_current.is_delete_marker;
                is_versioned := v_current.is_versioned;
                RETURN NEXT;
                v_count := v_count + 1;

                -- when v_multi_row, stay on this name and record its
                -- archived_at as the new tiebreak so remaining rows for the
                -- same key are picked up before moving to the next name
                IF v_multi_row THEN
                    v_next_seek := v_current.name;
                    v_next_seek_at := COALESCE(date_trunc('milliseconds', v_current.archived_at), 'infinity'::timestamptz);
                    v_next_seek_version := COALESCE(v_current.version, '');
                    v_next_seek_strict := false;
                ELSIF v_is_asc THEN
                    -- Appending the delimiter as a fake lexical successor
                    -- would skip a real key like `name || '!'` (or any
                    -- character sorting below the delimiter), which sorts
                    -- between `name` and `name || delimiter`. Track the real
                    -- name and mark the next comparison strict instead.
                    v_next_seek := v_current.name;
                    v_next_seek_strict := true;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;

        IF v_count = v_previous_count
           AND v_next_seek IS NOT DISTINCT FROM v_previous_seek
           AND v_next_seek_at IS NOT DISTINCT FROM v_previous_seek_at
           AND v_next_seek_version IS NOT DISTINCT FROM v_previous_seek_version THEN
            RAISE EXCEPTION 'storage.list_objects_with_delimiter made no progress at seek (%, %, %)',
                v_next_seek, v_next_seek_at, v_next_seek_version;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_bucket_control_columns(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_bucket_control_columns() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  configuration_changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle_configuration IS NOT NULL
       OR NEW.lifecycle_configuration_generation IS NOT NULL THEN
      IF NOT pg_has_role(current_user, TG_ARGV[0], 'MEMBER') THEN
        RAISE EXCEPTION 'only members of the configured storage service role may insert lifecycle policy state'
          USING ERRCODE = '42501',
                HINT = format(
                  'Insert with both lifecycle columns NULL and configure lifecycle through the Storage API afterward, or insert as a member of %I.',
                  TG_ARGV[0]
                );
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  configuration_changed =
    OLD.lifecycle_configuration IS DISTINCT FROM NEW.lifecycle_configuration
    OR OLD.lifecycle_configuration_generation IS DISTINCT FROM NEW.lifecycle_configuration_generation;

  IF NOT configuration_changed THEN
    RETURN NEW;
  END IF;

  IF NEW.type IS DISTINCT FROM 'STANDARD' THEN
    RAISE EXCEPTION 'bucket versioning and lifecycle controls require a Standard bucket'
      USING ERRCODE = '0A000';
  END IF;

  IF NEW.lifecycle_configuration IS NULL
     AND NEW.lifecycle_configuration_generation IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_configuration IS NULL
     OR NEW.lifecycle_configuration_generation IS NULL
     OR OLD.lifecycle_configuration IS NOT DISTINCT FROM NEW.lifecycle_configuration
     OR OLD.lifecycle_configuration_generation IS NOT DISTINCT FROM NEW.lifecycle_configuration_generation THEN
    RAISE EXCEPTION 'a changed lifecycle policy requires a new non-null generation'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_prefix_len INT;
    v_prefix_start INT;
    v_combined_levels INT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;
    v_version_filter TEXT;
    v_multi_row BOOLEAN;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;
    v_delete_marker_peek_query TEXT;
    v_delete_marker_peek_query_strict TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_next_seek_at TIMESTAMPTZ;
    v_next_seek_version TEXT;
    v_next_seek_strict BOOLEAN := false;
    v_count INT := 0;
    v_skipped INT := 0;
    v_previous_seek TEXT;
    v_previous_seek_at TIMESTAMPTZ;
    v_previous_seek_version TEXT;
    v_previous_count INT;
    v_previous_skipped INT;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_prefix_len := length(coalesce(prefix, ''));
    v_prefix_start := coalesce(array_length(string_to_array(coalesce(prefix, ''), v_delimiter), 1), 1);
    v_combined_levels := coalesce(array_length(string_to_array(v_prefix, v_delimiter), 1), 1);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);
    v_next_seek_at := NULL;
    v_next_seek_version := '';

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    v_multi_row := noncurrent_versions IN ('only', 'include');

    v_version_filter := '';
    IF noncurrent_versions = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NULL';
    ELSIF noncurrent_versions = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NOT NULL';
    END IF;
    IF delete_markers = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND NOT o.is_delete_marker';
    ELSIF delete_markers = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.is_delete_marker';
    END IF;

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT array_to_string(path_tokens[$1:$2], '/') AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $3 || '%%'
                  AND bucket_id = $4
                  AND array_length(objects.path_tokens, 1) <> $2
                  AND ($7 != 'exclude' OR objects.archived_at IS NULL)
                  AND ($7 != 'only' OR objects.archived_at IS NOT NULL)
                  AND ($8 != 'exclude' OR NOT objects.is_delete_marker)
                  AND ($8 != 'only' OR objects.is_delete_marker)
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata,
                   NULL::text AS version,
                   NULL::timestamptz AS archived_at,
                   NULL::boolean AS is_delete_marker,
                   NULL::boolean AS is_versioned FROM folders)
            UNION ALL
            (SELECT array_to_string(path_tokens[$1:$2], '/') AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata,
                   version, archived_at, is_delete_marker, is_versioned
             FROM storage.objects
             WHERE objects.name ILIKE $3 || '%%'
               AND bucket_id = $4
               AND array_length(objects.path_tokens, 1) = $2
               AND ($7 != 'exclude' OR objects.archived_at IS NULL)
               AND ($7 != 'only' OR objects.archived_at IS NOT NULL)
               AND ($8 != 'exclude' OR NOT objects.is_delete_marker)
               AND ($8 != 'only' OR objects.is_delete_marker)
             -- name, then version, as tiebreaks so two versions of the same
             -- key tying on the sort column still sort deterministically
             ORDER BY %I %s, name COLLATE "C" %s, COALESCE(version, '') %s)
            LIMIT $5 OFFSET $6
            $sql$, v_sort_order, v_order_by, v_sort_order, v_sort_order, v_sort_order
        ) USING v_prefix_start, v_combined_levels, v_prefix, bucketname, v_limit, offsets, noncurrent_versions, delete_markers;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build a resume-safe batch query. The exact-name branch returns remaining
    -- versions after the current (archived_at, version) boundary; the strict
    -- name branch returns subsequent keys. UNION ALL keeps both predicates
    -- independently indexable.
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" > $2 AND lower(o.name) COLLATE "C" < $3' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" ASC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" > $2' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" ASC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 AND lower(o.name) COLLATE "C" >= $3' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" DESC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" DESC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        END IF;
    END IF;

    -- Keep the delete-marker predicate literal so the cached generic
    -- plan can use idx_objects_delete_markers during the main-loop peek.
    IF delete_markers = 'only' THEN
        IF v_multi_row THEN
            v_delete_marker_peek_query :=
                'SELECT marker_page.name FROM (' || v_batch_query || ') marker_page LIMIT 1';
        ELSIF v_is_asc THEN
            -- Two separate literal query strings, not one gated by a bound
            -- boolean: folding "$n AND op1 OR NOT $n AND op2" into a single
            -- query defeats the generic plan's ability to push either
            -- comparison into the index. Branching in PL/pgSQL control flow
            -- instead keeps each query's index condition intact.
            v_delete_marker_peek_query :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" >= $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" < $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1';
            -- Strict variant: used once the single-row ASC batch advance
            -- (below) has left v_next_seek pointing at the last row already
            -- emitted, so a plain >= would re-match it forever.
            v_delete_marker_peek_query_strict :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" > $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" < $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1';
        ELSE
            v_delete_marker_peek_query :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" < $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" >= $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC performs one specialized initial seek so partial current-version
        -- and delete-marker indexes remain available.
        EXECUTE format(
            'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1%s%s ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1',
            CASE WHEN v_upper_bound IS NOT NULL
                THEN ' AND lower(o.name) COLLATE "C" >= $2 AND lower(o.name) COLLATE "C" < $3'
                ELSE ''
            END,
            v_version_filter
        )
        INTO v_peek_name
        USING bucketname, v_prefix_lower, v_upper_bound;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch and
    -- the delete-marker-only path
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        v_previous_seek := v_next_seek;
        v_previous_seek_at := v_next_seek_at;
        v_previous_seek_version := v_next_seek_version;
        v_previous_count := v_count;
        v_previous_skipped := v_skipped;

        -- STEP 1: PEEK
        v_peek_name := NULL;
        IF delete_markers = 'only' THEN
            EXECUTE CASE WHEN v_next_seek_strict
                THEN v_delete_marker_peek_query_strict
                ELSE v_delete_marker_peek_query
            END
                INTO v_peek_name
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END,
                    1, v_next_seek_at, v_next_seek_version;
        ELSIF v_multi_row AND v_next_seek_at IS NOT NULL THEN
            SELECT o.name INTO v_peek_name
            FROM storage.objects o
            WHERE o.bucket_id = bucketname
              AND lower(o.name) COLLATE "C" = v_next_seek
              AND (COALESCE(o.archived_at, 'infinity'::timestamptz) < v_next_seek_at
                   OR (COALESCE(o.archived_at, 'infinity'::timestamptz) = v_next_seek_at
                       AND COALESCE(o.version, '') > v_next_seek_version))
              AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
              AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
              AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
              AND (delete_markers != 'only' OR o.is_delete_marker)
            ORDER BY COALESCE(o.archived_at, 'infinity'::timestamptz) DESC,
                     COALESCE(o.version, '') ASC
            LIMIT 1;

            -- The current key is exhausted. Clear its version boundary and
            -- make the following ASC name peek strict. Appending '/' is not a
            -- valid lexical successor because keys ending in characters such
            -- as '!' sort between the exhausted name and name || '/'.
            IF v_peek_name IS NULL THEN
                IF v_is_asc THEN
                    v_next_seek_strict := true;
                END IF;
                v_next_seek_at := NULL;
                v_next_seek_version := '';
            END IF;
        END IF;

        -- Single-row mode is always noncurrent_versions='exclude'. Keep the
        -- current-row predicate literal so generic plans use the current index.
        IF delete_markers != 'only' AND v_peek_name IS NULL AND NOT v_multi_row THEN
            IF v_is_asc THEN
                IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSIF v_next_seek_strict THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSIF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSIF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                  AND o.archived_at IS NULL
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                  AND o.archived_at IS NULL
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        ELSIF delete_markers != 'only' AND v_peek_name IS NULL AND v_is_asc THEN
            IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSIF v_next_seek_strict THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSIF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSIF delete_markers != 'only' AND v_peek_name IS NULL THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- If the peek landed on a different key than we were tracking, any
        -- version boundary belongs to the OLD key and must not leak into the
        -- new one - e.g. the deleteMarkers='only' peek doesn't know or care
        -- whether it's continuing the same key or jumping to a new one, so
        -- it never clears these itself.
        IF lower(v_peek_name) IS DISTINCT FROM v_next_seek THEN
            v_next_seek_at := NULL;
            v_next_seek_version := '';
        END IF;

        -- The peek is authoritative for the next key to process. This is
        -- especially important after exhausting a multi-version key: the
        -- version boundary has been cleared, so executing the batch against
        -- a stale v_next_seek would replay every version of that old key.
        v_next_seek := lower(v_peek_name);
        v_next_seek_strict := false;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := substring(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter) from v_prefix_len + 1);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                version := NULL;
                archived_at := NULL;
                is_delete_marker := NULL;
                is_versioned := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
            v_next_seek_at := NULL;
            v_next_seek_version := '';
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size,
                    v_next_seek_at, v_next_seek_version
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it. Reset
                    -- strict mode too - it may have been set by an earlier
                    -- row in this same batch (see the single-row ASC advance
                    -- below), and v_next_seek here is the folder-triggering
                    -- row's own name, which the next peek must find inclusively.
                    v_next_seek := CASE
                        WHEN v_is_asc THEN lower(v_current.name)
                        ELSE lower(v_current.name) || v_delimiter
                    END;
                    v_next_seek_at := NULL;
                    v_next_seek_version := '';
                    v_next_seek_strict := false;
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := substring(v_current.name from v_prefix_len + 1);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    version := v_current.version;
                    archived_at := v_current.archived_at;
                    is_delete_marker := v_current.is_delete_marker;
                    is_versioned := v_current.is_versioned;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Multi-row mode must remain on this key until all of its
                -- versions have crossed the internal batch boundary.
                IF v_multi_row THEN
                    v_next_seek := lower(v_current.name);
                    v_next_seek_at := COALESCE(v_current.archived_at, 'infinity'::timestamptz);
                    v_next_seek_version := COALESCE(v_current.version, '');
                ELSIF v_is_asc THEN
                    -- Appending the delimiter as a fake lexical successor would
                    -- skip a real key like `name || '!'` (or any character
                    -- sorting below the delimiter), which sorts between `name`
                    -- and `name || delimiter`. Track the real name and mark the
                    -- next comparison strict instead - same fix as the
                    -- exhausted-key case above.
                    v_next_seek := lower(v_current.name);
                    v_next_seek_strict := true;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;

        IF v_count = v_previous_count
           AND v_skipped = v_previous_skipped
           AND v_next_seek IS NOT DISTINCT FROM v_previous_seek
           AND v_next_seek_at IS NOT DISTINCT FROM v_previous_seek_at
           AND v_next_seek_version IS NOT DISTINCT FROM v_previous_seek_version THEN
            RAISE EXCEPTION 'storage.search made no progress at seek (%, %, %)',
                v_next_seek, v_next_seek_at, v_next_seek_version;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text, p_start_after_version text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
    v_prefix_pattern text;
    v_sort_order text;
    v_sort_column text;
    v_version_tiebreak text;
BEGIN
    v_prefix := coalesce(p_prefix, '');
    -- Keep the raw prefix for common-prefix calculations and escape only LIKE metacharacters.
    v_prefix_pattern := replace(v_prefix, chr(92), chr(92) || chr(92));
    v_prefix_pattern := replace(v_prefix_pattern, '%', chr(92) || '%');
    v_prefix_pattern := replace(v_prefix_pattern, '_', chr(92) || '_');

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    -- $9 is only populated in multi-row mode; it's always '' otherwise, so
    -- only use each row's real version as a tiebreak in multi-row mode.
    v_version_tiebreak := CASE WHEN noncurrent_versions IN ('only', 'include') THEN 'COALESCE(version, '''')' ELSE '''''' END;

    -- Defense-in-depth: this function is independently reachable and must
    -- not trust p_sort_order/p_sort_column to already be validated by a
    -- caller. Normalize to the same strict allow-list storage.search_v2
    -- uses before interpolating anything into dynamic SQL below.
    v_sort_order := lower(coalesce(p_sort_order, 'asc'));
    IF v_sort_order NOT IN ('asc', 'desc') THEN
        v_sort_order := 'asc';
    END IF;

    v_sort_column := lower(coalesce(p_sort_column, 'updated_at'));
    IF v_sort_column NOT IN ('updated_at', 'created_at') THEN
        v_sort_column := 'updated_at';
    END IF;

    IF v_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                o.version AS obj_version,
                o.archived_at AS obj_archived_at,
                o.is_delete_marker AS obj_is_delete_marker,
                o.is_versioned AS obj_is_versioned,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $10 || '%%'
              AND ($7 != 'exclude' OR o.archived_at IS NULL)
              AND ($7 != 'only' OR o.archived_at IS NOT NULL)
              AND ($8 != 'exclude' OR NOT o.is_delete_marker)
              AND ($8 != 'only' OR o.is_delete_marker)
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                common_prefix AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                NULL::text AS version,
                NULL::timestamptz AS archived_at,
                NULL::boolean AS is_delete_marker,
                NULL::boolean AS is_versioned,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                obj_version AS version,
                obj_archived_at AS archived_at,
                obj_is_delete_marker AS is_delete_marker,
                obj_is_versioned AS is_versioned,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz),
                    name COLLATE "C",
                    %s
                ) %s ROW(
                    -- truncated the same way as the stored value above
                    date_trunc('milliseconds', COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz)),
                    $5,
                    $9
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata,
            version,
            archived_at,
            is_delete_marker,
            is_versioned
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s,
            COALESCE(version, '') %s
        LIMIT $4
    $sql$,
        v_sort_column,
        v_version_tiebreak,
        v_cursor_op,
        v_sort_column,
        v_sort_order,
        v_sort_order,
        v_sort_order
    );

    -- version is the third tiebreak component for two versions of the same
    -- key tying on both timestamp and name (see filtered CTE / ORDER BY above)
    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after, noncurrent_versions, delete_markers, coalesce(p_start_after_version, ''), v_prefix_pattern;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text, text, text, timestamp with time zone, text, boolean); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text, start_after_archived_at timestamp with time zone DEFAULT NULL::timestamp with time zone, start_after_version text DEFAULT ''::text, start_after_is_continuation boolean DEFAULT false) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata,
            l.version,
            l.archived_at,
            l.is_delete_marker,
            l.is_versioned
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            CASE WHEN start_after_is_continuation THEN '' ELSE start_after END,
            CASE WHEN start_after_is_continuation THEN start_after ELSE '' END,
            v_sort_ord,
            noncurrent_versions,
            delete_markers,
            start_after_archived_at,
            start_after_version
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after,
            noncurrent_versions, delete_markers, start_after_version
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: mfa_recovery_code_sets; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_recovery_code_sets (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    mfa_factor_id uuid NOT NULL,
    failed_verification_count integer DEFAULT 0 NOT NULL,
    verification_locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mfa_recovery_code_sets_failed_verification_count_check CHECK ((failed_verification_count >= 0))
);


--
-- Name: mfa_recovery_codes; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_recovery_codes (
    id uuid NOT NULL,
    mfa_recovery_code_set_id uuid NOT NULL,
    code_hash text NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: scim_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.scim_tokens (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    token_hash text NOT NULL,
    prefix text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    last_used_at timestamp with time zone,
    CONSTRAINT scim_tokens_expires_at_future CHECK (((expires_at IS NULL) OR (expires_at > created_at))),
    CONSTRAINT scim_tokens_revoked_after_created CHECK (((revoked_at IS NULL) OR (revoked_at >= created_at))),
    CONSTRAINT scim_tokens_token_hash_check CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: scim_users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.scim_users (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    user_id uuid,
    resource jsonb NOT NULL,
    user_name text GENERATED ALWAYS AS (lower((resource ->> 'userName'::text))) STORED NOT NULL,
    external_id text GENERATED ALWAYS AS ((resource ->> 'externalId'::text)) STORED,
    active boolean GENERATED ALWAYS AS (COALESCE(((resource ->> 'active'::text))::boolean, true)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: brincadeira; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brincadeira (
    "brincadeiraId" character varying(36) CONSTRAINT brincadeiras_id_not_null NOT NULL,
    nome character varying(100) CONSTRAINT brincadeiras_name_not_null NOT NULL,
    descricao character varying(500),
    regras text,
    tipo character varying(20) DEFAULT 'team'::character varying,
    duracao integer DEFAULT 30,
    status character varying(20) DEFAULT 'active'::character varying,
    "pontosPadrao" integer DEFAULT 10,
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "empresaId" character varying(36),
    "tipoJogo" character varying(50) DEFAULT 'standard'::character varying,
    checkpoints text,
    "eventoId" text
);


--
-- Name: cacaTesourPartida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."cacaTesourPartida" (
    "partidaId" character varying(36) CONSTRAINT caca_tesouro_partidas_id_not_null NOT NULL,
    "eventoId" character varying(36) CONSTRAINT caca_tesouro_partidas_evento_id_not_null NOT NULL,
    "brincadeiraId" character varying(36) CONSTRAINT caca_tesouro_partidas_brincadeira_id_not_null NOT NULL,
    status character varying(20) CONSTRAINT caca_tesouro_partidas_status_not_null NOT NULL,
    "numeroRonda" integer CONSTRAINT caca_tesouro_partidas_round_number_not_null NOT NULL,
    "checkpointAlvoId" character varying(36),
    "checkpointsCompletadosIds" text,
    "iniciadoEm" timestamp with time zone CONSTRAINT caca_tesouro_partidas_started_at_not_null NOT NULL,
    "rondaIniciadaEm" timestamp with time zone CONSTRAINT caca_tesouro_partidas_round_started_at_not_null NOT NULL,
    "finalizadoEm" timestamp with time zone,
    "timeInicialId" character varying(36),
    "timeVezId" character varying(36),
    "vezDisponvelEm" timestamp with time zone
);


--
-- Name: cacaTesourScan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."cacaTesourScan" (
    "scanId" character varying(36) CONSTRAINT caca_tesouro_scans_id_not_null NOT NULL,
    "partidaId" character varying(36) CONSTRAINT caca_tesouro_scans_partida_id_not_null NOT NULL,
    "eventoId" character varying(36) CONSTRAINT caca_tesouro_scans_evento_id_not_null NOT NULL,
    "brincadeiraId" character varying(36) CONSTRAINT caca_tesouro_scans_brincadeira_id_not_null NOT NULL,
    "numeroRonda" integer CONSTRAINT caca_tesouro_scans_round_number_not_null NOT NULL,
    "checkpointId" character varying(36) CONSTRAINT caca_tesouro_scans_checkpoint_id_not_null NOT NULL,
    "criancaId" character varying(36) CONSTRAINT caca_tesouro_scans_crianca_id_not_null NOT NULL,
    "timeId" character varying(36) CONSTRAINT caca_tesouro_scans_time_id_not_null NOT NULL,
    uid character varying(100) CONSTRAINT caca_tesouro_scans_uid_not_null NOT NULL,
    "leroEm" timestamp with time zone CONSTRAINT caca_tesouro_scans_scanned_at_not_null NOT NULL
);


--
-- Name: chamadoSuport; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."chamadoSuport" (
    "ticketId" character varying(36) CONSTRAINT support_tickets_id_not_null NOT NULL,
    "empresaId" character varying(36),
    cliente character varying(255) CONSTRAINT support_tickets_client_not_null NOT NULL,
    assunto character varying(255) CONSTRAINT support_tickets_subject_not_null NOT NULL,
    status character varying(20) DEFAULT 'aberto'::character varying CONSTRAINT support_tickets_status_not_null NOT NULL,
    prioridade character varying(20) DEFAULT 'media'::character varying CONSTRAINT support_tickets_priority_not_null NOT NULL,
    descricao text,
    "atribuidoPara" character varying(255),
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT support_tickets_created_at_not_null NOT NULL,
    "atualizadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT support_tickets_updated_at_not_null NOT NULL
);


--
-- Name: etiquetaCheckpoint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."etiquetaCheckpoint" (
    "tagId" integer CONSTRAINT checkpoint_tags_id_not_null NOT NULL,
    "checkpointId" character varying(36) CONSTRAINT checkpoint_tags_checkpoint_id_not_null NOT NULL,
    "tagUid" character varying(50) CONSTRAINT checkpoint_tags_tag_uid_not_null NOT NULL,
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: checkpoint_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."etiquetaCheckpoint" ALTER COLUMN "tagId" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.checkpoint_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente (
    "clienteId" character varying(36) CONSTRAINT clientes_id_not_null NOT NULL,
    nome character varying(100) CONSTRAINT clientes_name_not_null NOT NULL,
    cidade character varying(100),
    estado character varying(2),
    email character varying(100) CONSTRAINT clientes_email_not_null NOT NULL,
    telefone character varying(20),
    plano character varying(20) DEFAULT 'starter'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    "eventosRealizados" integer DEFAULT 0,
    "ultimoAcesso" timestamp with time zone,
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    empresa_id character varying(36),
    address character varying(255),
    backup_frequency character varying(20) DEFAULT 'daily'::character varying,
    logo_data text,
    logo_name character varying(255),
    logo_type character varying(100)
);


--
-- Name: codigoVinculoFamiliar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."codigoVinculoFamiliar" (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT family_linking_codes_id_not_null NOT NULL,
    crianca_id character varying(36) CONSTRAINT family_linking_codes_crianca_id_not_null NOT NULL,
    evento_id character varying(36) CONSTRAINT family_linking_codes_evento_id_not_null NOT NULL,
    empresa_id character varying(36) CONSTRAINT family_linking_codes_empresa_id_not_null NOT NULL,
    qr_code_value character varying(50) CONSTRAINT family_linking_codes_qr_code_value_not_null NOT NULL,
    tracking_url character varying(500) CONSTRAINT family_linking_codes_tracking_url_not_null NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone CONSTRAINT family_linking_codes_expires_at_not_null NOT NULL,
    used_at timestamp without time zone,
    used_by_login_id character varying(36)
);


--
-- Name: configuracao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracao (
    "settingId" integer CONSTRAINT settings_id_not_null NOT NULL,
    setting_key character varying(100) CONSTRAINT settings_setting_key_not_null NOT NULL,
    setting_value text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    empresa_id text
);


--
-- Name: conquista; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conquista (
    "conquistaId" character varying(36) CONSTRAINT conquistas_id_not_null NOT NULL,
    nome character varying(100) CONSTRAINT conquistas_name_not_null NOT NULL,
    descricao character varying(500),
    icone character varying(50),
    cor character varying(20),
    "tipoRequerido" character varying(50),
    "valorRequerido" integer,
    "pontosBonus" integer DEFAULT 0,
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: conviteFamilia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."conviteFamilia" (
    "conviteId" character varying(36) CONSTRAINT family_invites_id_not_null NOT NULL,
    "empresaId" character varying(36) CONSTRAINT family_invites_empresa_id_not_null NOT NULL,
    "eventoId" character varying(36) CONSTRAINT family_invites_evento_id_not_null NOT NULL,
    "criancaId" character varying(36),
    email character varying(255),
    "hashToken" character varying(128) CONSTRAINT family_invites_token_hash_not_null NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying CONSTRAINT family_invites_status_not_null NOT NULL,
    "expiramEm" timestamp with time zone CONSTRAINT family_invites_expires_at_not_null NOT NULL,
    "usadoEm" timestamp with time zone,
    "criadoPor" character varying(36),
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT family_invites_created_at_not_null NOT NULL
);


--
-- Name: crianca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crianca (
    "criancaId" character varying(36) CONSTRAINT criancas_id_not_null NOT NULL,
    "eventoId" character varying(36) CONSTRAINT criancas_evento_id_not_null NOT NULL,
    "timeId" character varying(36),
    nome character varying(100) CONSTRAINT criancas_name_not_null NOT NULL,
    apelido character varying(100),
    idade integer,
    avatar character varying(64) DEFAULT '??'::character varying,
    "codigoPulseira" character varying(50),
    pontos integer DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying,
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "empresaId" character varying(36),
    qr_code character varying
);


--
-- Name: criancaConquista; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."criancaConquista" (
    "criancaId" character varying(36) CONSTRAINT crianca_conquistas_crianca_id_not_null NOT NULL,
    "conquistaId" character varying(36) CONSTRAINT crianca_conquistas_conquista_id_not_null NOT NULL,
    "desbloqueadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: empresa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresa (
    "empresaId" character varying(36) CONSTRAINT empresas_id_not_null NOT NULL,
    nome character varying(255) CONSTRAINT empresas_nome_not_null NOT NULL,
    cidade character varying(100),
    estado character varying(2),
    telefone character varying(20),
    plano character varying(50) DEFAULT 'starter'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    "dataCriacao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    latitude double precision,
    longitude double precision,
    cnpj character varying(14),
    floor_plan_data text,
    floor_plan_name character varying(255),
    floor_plan_type character varying(100),
    zones_data text
);


--
-- Name: evento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evento (
    "eventoId" character varying(36) CONSTRAINT eventos_id_not_null NOT NULL,
    "clienteId" character varying(36),
    nome character varying(100) CONSTRAINT eventos_name_not_null NOT NULL,
    descricao character varying(500),
    data date CONSTRAINT eventos_date_not_null NOT NULL,
    hora time without time zone,
    duracao integer DEFAULT 120,
    status character varying(20) DEFAULT 'scheduled'::character varying,
    "exibirDisplay" integer DEFAULT 1,
    "exibirLocalizacao" integer DEFAULT 0,
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "empresaId" character varying(36),
    "tipoJogoAtivo" character varying(50) DEFAULT 'none'::character varying,
    "brincadeiraAtivaId" character varying(36),
    "dadosPlanoPiso" text,
    "nomePlanoPiso" character varying(255),
    "tipoPlanoPiso" character varying(100),
    zones_data text,
    "nomeResponsavel" character varying(150),
    "iniciadoEm" timestamp with time zone,
    "finalizadoEm" timestamp with time zone,
    "autoInicio" integer DEFAULT 0,
    "autoFim" integer DEFAULT 0
);


--
-- Name: eventoBrincadeira; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."eventoBrincadeira" (
    "eventoId" character varying(36) CONSTRAINT evento_brincadeiras_evento_id_not_null NOT NULL,
    "brincadeiraId" character varying(36) CONSTRAINT evento_brincadeiras_brincadeira_id_not_null NOT NULL,
    ordem integer DEFAULT 0,
    "multiplicadorPontos" integer DEFAULT 1,
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: leitura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leitura (
    "leituraId" character varying(36) CONSTRAINT leituras_id_not_null NOT NULL,
    "checkpointId" character varying(36) CONSTRAINT leituras_checkpoint_id_not_null NOT NULL,
    "criancaId" character varying(36),
    uid character varying(50) CONSTRAINT leituras_uid_not_null NOT NULL,
    "brincadeiraId" text,
    autorizado integer DEFAULT 0,
    "pontosAtribuidos" integer DEFAULT 0,
    "forcaSinal" integer,
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "empresaId" character varying(36),
    session_id character varying(36)
);


--
-- Name: log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log (
    "logId" integer CONSTRAINT logs_id_not_null NOT NULL,
    tipo character varying(20) CONSTRAINT logs_tipo_not_null NOT NULL,
    "clienteId" character varying(36),
    "eventoId" character varying(36),
    mensagem character varying(500) CONSTRAINT logs_message_not_null NOT NULL,
    detalhes text,
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "empresaId" character varying(36)
);


--
-- Name: logins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logins (
    "loginId" character varying(36) CONSTRAINT logins_id_not_null NOT NULL,
    "empresaId" character varying(36) CONSTRAINT logins_empresa_id_not_null NOT NULL,
    email character varying(255) NOT NULL,
    senha character varying(255) CONSTRAINT logins_password_not_null NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    "ultimoAcesso" timestamp with time zone,
    "dataCriacao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    perfil character varying(50) DEFAULT 'admin'::character varying,
    "nomeFamilia" character varying(255)
);


--
-- Name: logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.log ALTER COLUMN "logId" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mensagemDisplay; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."mensagemDisplay" (
    "mensagemId" character varying(36) CONSTRAINT mensagens_display_id_not_null NOT NULL,
    "eventoId" character varying(36) CONSTRAINT mensagens_display_evento_id_not_null NOT NULL,
    texto character varying(500) CONSTRAINT mensagens_display_text_not_null NOT NULL,
    tipo character varying(20) DEFAULT 'custom'::character varying,
    remetente character varying(100),
    "enviadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: monsterCacaLeitura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."monsterCacaLeitura" (
    id character varying(36) CONSTRAINT monster_hunt_scans_id_not_null NOT NULL,
    partida_id character varying(36) CONSTRAINT monster_hunt_scans_partida_id_not_null NOT NULL,
    empresa_id character varying(36) CONSTRAINT monster_hunt_scans_empresa_id_not_null NOT NULL,
    evento_id character varying(36) CONSTRAINT monster_hunt_scans_evento_id_not_null NOT NULL,
    brincadeira_id character varying(36),
    checkpoint_id character varying(36) CONSTRAINT monster_hunt_scans_checkpoint_id_not_null NOT NULL,
    crianca_id character varying(36) CONSTRAINT monster_hunt_scans_crianca_id_not_null NOT NULL,
    time_id character varying(36),
    uid character varying(255),
    leitura_id character varying(36),
    attack_type character varying(30) CONSTRAINT monster_hunt_scans_attack_type_not_null NOT NULL,
    damage integer DEFAULT 0 CONSTRAINT monster_hunt_scans_damage_not_null NOT NULL,
    monster_hp_after integer CONSTRAINT monster_hunt_scans_monster_hp_after_not_null NOT NULL,
    monster_defeated boolean DEFAULT false CONSTRAINT monster_hunt_scans_monster_defeated_not_null NOT NULL,
    version integer DEFAULT 0 CONSTRAINT monster_hunt_scans_version_not_null NOT NULL,
    scanned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT monster_hunt_scans_scanned_at_not_null NOT NULL
);


--
-- Name: monsterCacaPartida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."monsterCacaPartida" (
    id character varying(36) CONSTRAINT monster_hunt_partidas_id_not_null NOT NULL,
    empresa_id character varying(36) CONSTRAINT monster_hunt_partidas_empresa_id_not_null NOT NULL,
    evento_id character varying(36) CONSTRAINT monster_hunt_partidas_evento_id_not_null NOT NULL,
    brincadeira_id character varying(36),
    status character varying(20) DEFAULT 'active'::character varying CONSTRAINT monster_hunt_partidas_status_not_null NOT NULL,
    hp integer DEFAULT 100 CONSTRAINT monster_hunt_partidas_hp_not_null NOT NULL,
    max_hp integer DEFAULT 100 CONSTRAINT monster_hunt_partidas_max_hp_not_null NOT NULL,
    normal_damage integer DEFAULT 10 CONSTRAINT monster_hunt_partidas_normal_damage_not_null NOT NULL,
    special_checkpoint_damage integer DEFAULT 30 CONSTRAINT monster_hunt_partidas_special_checkpoint_damage_not_null NOT NULL,
    special_attack_damage integer DEFAULT 50 CONSTRAINT monster_hunt_partidas_special_attack_damage_not_null NOT NULL,
    special_checkpoint_id character varying(36),
    winner_time_id character varying(36),
    version integer DEFAULT 0 CONSTRAINT monster_hunt_partidas_version_not_null NOT NULL,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT monster_hunt_partidas_started_at_not_null NOT NULL,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT monster_hunt_partidas_created_at_not_null NOT NULL
);


--
-- Name: pontoVerificacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."pontoVerificacao" (
    "checkpointId" character varying(36) CONSTRAINT checkpoints_id_not_null NOT NULL,
    "eventoId" character varying(36) CONSTRAINT checkpoints_evento_id_not_null NOT NULL,
    nome character varying(100) CONSTRAINT checkpoints_name_not_null NOT NULL,
    tipo character varying(20) DEFAULT 'NFC'::character varying,
    ip character varying(15),
    zona character varying(100),
    "corLed" character varying(20) DEFAULT '#00FF00'::character varying,
    points integer DEFAULT 10,
    status character varying(20) DEFAULT 'offline'::character varying,
    "territorioDonoTimeId" character varying(36),
    "territorioTravadoAte" timestamp with time zone,
    "territorioCooldownAte" timestamp with time zone,
    "ultimoConquistadoEm" timestamp with time zone,
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "empresaId" character varying(36),
    "tagsAutorizadas" text,
    "ultimoVisto" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    location character varying(100),
    proposito character varying(20) DEFAULT 'game'::character varying,
    "mapaX" integer,
    "mapaY" integer,
    "territorioDonosCriancaId" character varying(36)
);


--
-- Name: pontuacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pontuacao (
    "pontuacaoId" character varying(36) CONSTRAINT pontuacoes_id_not_null NOT NULL,
    "eventoId" character varying(36) CONSTRAINT pontuacoes_evento_id_not_null NOT NULL,
    "criancaId" character varying(36) CONSTRAINT pontuacoes_crianca_id_not_null NOT NULL,
    "brincadeiraId" text,
    "checkpointId" character varying(36) CONSTRAINT pontuacoes_checkpoint_id_not_null NOT NULL,
    pontos integer CONSTRAINT pontuacoes_points_not_null NOT NULL,
    "leituraId" character varying(36),
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "empresaId" character varying(36)
);


--
-- Name: pulseira; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pulseira (
    codigo character varying(50) CONSTRAINT pulseiras_code_not_null NOT NULL,
    status character varying(20) DEFAULT 'disponivel'::character varying,
    crianca_id character varying(36),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    empresa_id character varying(36)
);


--
-- Name: sessoesJogo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."sessoesJogo" (
    id character varying(36) CONSTRAINT game_sessions_id_not_null NOT NULL,
    evento_id character varying(36) CONSTRAINT game_sessions_evento_id_not_null NOT NULL,
    brincadeira_id character varying(36) CONSTRAINT game_sessions_brincadeira_id_not_null NOT NULL,
    game_type character varying(50) CONSTRAINT game_sessions_game_type_not_null NOT NULL,
    mode character varying(20),
    status character varying(20) DEFAULT 'active'::character varying CONSTRAINT game_sessions_status_not_null NOT NULL,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT game_sessions_started_at_not_null NOT NULL,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT game_sessions_created_at_not_null NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT game_sessions_updated_at_not_null NOT NULL
);


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.configuracao ALTER COLUMN "settingId" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: time; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."time" (
    "timeId" character varying(36) CONSTRAINT times_id_not_null NOT NULL,
    evento_id character varying(36),
    nome character varying(50) CONSTRAINT times_name_not_null NOT NULL,
    cor character varying(20) CONSTRAINT times_color_not_null NOT NULL,
    pontos integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    empresa_id character varying(36)
);


--
-- Name: vinculoFamiliar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."vinculoFamiliar" (
    "vinculoId" character varying(36) CONSTRAINT family_child_links_id_not_null NOT NULL,
    "loginId" character varying(36) CONSTRAINT family_child_links_login_id_not_null NOT NULL,
    "criancaId" character varying(36) CONSTRAINT family_child_links_crianca_id_not_null NOT NULL,
    "empresaId" character varying(36) CONSTRAINT family_child_links_empresa_id_not_null NOT NULL,
    relacionamento character varying(50) DEFAULT 'responsÃ¡vel'::character varying CONSTRAINT family_child_links_relationship_not_null NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying CONSTRAINT family_child_links_status_not_null NOT NULL,
    "aprovadoPor" character varying(36),
    "aprovadoEm" timestamp with time zone,
    "rejeitadoEm" timestamp with time zone,
    "criadoEm" timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT family_child_links_created_at_not_null NOT NULL
);


--
-- Name: zona; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zona (
    "zonaId" character varying(36) CONSTRAINT zonas_id_not_null NOT NULL,
    evento_id character varying(36) CONSTRAINT zonas_evento_id_not_null NOT NULL,
    nome character varying(100) CONSTRAINT zonas_name_not_null NOT NULL,
    cor character varying(20) CONSTRAINT zonas_color_not_null NOT NULL,
    x integer CONSTRAINT zonas_x_not_null NOT NULL,
    y integer CONSTRAINT zonas_y_not_null NOT NULL,
    width integer CONSTRAINT zonas_width_not_null NOT NULL,
    height integer CONSTRAINT zonas_height_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: zonaConquistaLeituraIndividual; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."zonaConquistaLeituraIndividual" (
    id character varying(36) CONSTRAINT zone_conquest_individual_scans_id_not_null NOT NULL,
    partida_id character varying(36) CONSTRAINT zone_conquest_individual_scans_partida_id_not_null NOT NULL,
    empresa_id character varying(36) CONSTRAINT zone_conquest_individual_scans_empresa_id_not_null NOT NULL,
    evento_id character varying(36) CONSTRAINT zone_conquest_individual_scans_evento_id_not_null NOT NULL,
    brincadeira_id character varying(36) CONSTRAINT zone_conquest_individual_scans_brincadeira_id_not_null NOT NULL,
    checkpoint_id character varying(36) CONSTRAINT zone_conquest_individual_scans_checkpoint_id_not_null NOT NULL,
    crianca_id character varying(36) CONSTRAINT zone_conquest_individual_scans_crianca_id_not_null NOT NULL,
    uid character varying(255),
    leitura_id character varying(36),
    points_awarded numeric(10,2) DEFAULT 0 CONSTRAINT zone_conquest_individual_scans_points_awarded_not_null NOT NULL,
    version integer DEFAULT 0 CONSTRAINT zone_conquest_individual_scans_version_not_null NOT NULL,
    scanned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_individual_scans_scanned_at_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_individual_scans_created_at_not_null NOT NULL
);


--
-- Name: zonaConquistaLeituraTime; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."zonaConquistaLeituraTime" (
    id character varying(36) CONSTRAINT zone_conquest_team_scans_id_not_null NOT NULL,
    partida_id character varying(36) CONSTRAINT zone_conquest_team_scans_partida_id_not_null NOT NULL,
    empresa_id character varying(36) CONSTRAINT zone_conquest_team_scans_empresa_id_not_null NOT NULL,
    evento_id character varying(36) CONSTRAINT zone_conquest_team_scans_evento_id_not_null NOT NULL,
    brincadeira_id character varying(36) CONSTRAINT zone_conquest_team_scans_brincadeira_id_not_null NOT NULL,
    round_number integer CONSTRAINT zone_conquest_team_scans_round_number_not_null NOT NULL,
    checkpoint_id character varying(36) CONSTRAINT zone_conquest_team_scans_checkpoint_id_not_null NOT NULL,
    crianca_id character varying(36) CONSTRAINT zone_conquest_team_scans_crianca_id_not_null NOT NULL,
    time_id character varying(36) CONSTRAINT zone_conquest_team_scans_time_id_not_null NOT NULL,
    uid character varying(255),
    leitura_id character varying(36),
    points_awarded numeric(10,2) DEFAULT 0 CONSTRAINT zone_conquest_team_scans_points_awarded_not_null NOT NULL,
    scanned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_team_scans_scanned_at_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_team_scans_created_at_not_null NOT NULL
);


--
-- Name: zonaConquistaPartidaIndividual; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."zonaConquistaPartidaIndividual" (
    id character varying(36) CONSTRAINT zone_conquest_individual_partidas_id_not_null NOT NULL,
    empresa_id character varying(36) CONSTRAINT zone_conquest_individual_partidas_empresa_id_not_null NOT NULL,
    evento_id character varying(36) CONSTRAINT zone_conquest_individual_partidas_evento_id_not_null NOT NULL,
    brincadeira_id character varying(36) CONSTRAINT zone_conquest_individual_partidas_brincadeira_id_not_null NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying CONSTRAINT zone_conquest_individual_partidas_status_not_null NOT NULL,
    version integer DEFAULT 0 CONSTRAINT zone_conquest_individual_partidas_version_not_null NOT NULL,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_individual_partidas_started_at_not_null NOT NULL,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_individual_partidas_created_at_not_null NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_individual_partidas_updated_at_not_null NOT NULL
);


--
-- Name: zonaConquistaPartidaTime; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."zonaConquistaPartidaTime" (
    id character varying(36) CONSTRAINT zone_conquest_team_partidas_id_not_null NOT NULL,
    empresa_id character varying(36) CONSTRAINT zone_conquest_team_partidas_empresa_id_not_null NOT NULL,
    evento_id character varying(36) CONSTRAINT zone_conquest_team_partidas_evento_id_not_null NOT NULL,
    brincadeira_id character varying(36) CONSTRAINT zone_conquest_team_partidas_brincadeira_id_not_null NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying CONSTRAINT zone_conquest_team_partidas_status_not_null NOT NULL,
    round_number integer DEFAULT 1 CONSTRAINT zone_conquest_team_partidas_round_number_not_null NOT NULL,
    current_team_id character varying(36),
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_team_partidas_started_at_not_null NOT NULL,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_team_partidas_created_at_not_null NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_team_partidas_updated_at_not_null NOT NULL
);


--
-- Name: zonaConquistaProtecaoCheckpointIndividual; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."zonaConquistaProtecaoCheckpointIndividual" (
    id character varying(36) CONSTRAINT zone_conquest_individual_checkpoint_protection_id_not_null NOT NULL,
    partida_id character varying(36) CONSTRAINT zone_conquest_individual_checkpoint_protect_partida_id_not_null NOT NULL,
    checkpoint_id character varying(36) CONSTRAINT zone_conquest_individual_checkpoint_prot_checkpoint_id_not_null NOT NULL,
    crianca_id character varying(36) CONSTRAINT zone_conquest_individual_checkpoint_protect_crianca_id_not_null NOT NULL,
    protection_until timestamp with time zone CONSTRAINT zone_conquest_individual_checkpoint_p_protection_until_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_individual_checkpoint_protect_created_at_not_null NOT NULL
);


--
-- Name: zonaConquistaTempoTime; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."zonaConquistaTempoTime" (
    id character varying(36) CONSTRAINT zone_conquest_team_tempos_id_not_null NOT NULL,
    partida_id character varying(36) CONSTRAINT zone_conquest_team_tempos_partida_id_not_null NOT NULL,
    empresa_id character varying(36) CONSTRAINT zone_conquest_team_tempos_empresa_id_not_null NOT NULL,
    evento_id character varying(36) CONSTRAINT zone_conquest_team_tempos_evento_id_not_null NOT NULL,
    time_id character varying(36) CONSTRAINT zone_conquest_team_tempos_time_id_not_null NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying CONSTRAINT zone_conquest_team_tempos_status_not_null NOT NULL,
    zones_dominated integer DEFAULT 0 CONSTRAINT zone_conquest_team_tempos_zones_dominated_not_null NOT NULL,
    checkpoints_read integer DEFAULT 0 CONSTRAINT zone_conquest_team_tempos_checkpoints_read_not_null NOT NULL,
    total_points numeric(10,2) DEFAULT 0 CONSTRAINT zone_conquest_team_tempos_total_points_not_null NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    elapsed_ms integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_team_tempos_created_at_not_null NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT zone_conquest_team_tempos_updated_at_not_null NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    skip_broadcast boolean DEFAULT false NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone DEFAULT now()
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    selected_columns text[],
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL,
    versioning_status text DEFAULT 'DISABLED'::text NOT NULL,
    lifecycle_configuration jsonb,
    lifecycle_configuration_generation uuid,
    CONSTRAINT buckets_lifecycle_configuration_pair_check CHECK (((lifecycle_configuration IS NULL) = (lifecycle_configuration_generation IS NULL))),
    CONSTRAINT buckets_lifecycle_configuration_shape_check CHECK (((lifecycle_configuration IS NULL) OR ((jsonb_typeof(lifecycle_configuration) = 'object'::text) AND (lifecycle_configuration ? 'rules'::text) AND
CASE
    WHEN (jsonb_typeof((lifecycle_configuration -> 'rules'::text)) = 'array'::text) THEN ((jsonb_array_length((lifecycle_configuration -> 'rules'::text)) >= 1) AND (jsonb_array_length((lifecycle_configuration -> 'rules'::text)) <= 1000))
    ELSE false
END))),
    CONSTRAINT buckets_lifecycle_configuration_standard_only_check CHECK (((type = 'STANDARD'::storage.buckettype) OR ((lifecycle_configuration IS NULL) AND (lifecycle_configuration_generation IS NULL)))),
    CONSTRAINT buckets_versioning_dark_check CHECK ((versioning_status = 'DISABLED'::text)),
    CONSTRAINT buckets_versioning_standard_only_check CHECK (((type = 'STANDARD'::storage.buckettype) OR (versioning_status = 'DISABLED'::text))),
    CONSTRAINT buckets_versioning_status_check CHECK ((versioning_status = ANY (ARRAY['DISABLED'::text, 'ENABLED'::text, 'SUSPENDED'::text])))
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    archived_at timestamp with time zone,
    is_delete_marker boolean DEFAULT false NOT NULL,
    is_versioned boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at, custom_claims_allowlist) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: mfa_recovery_code_sets; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_recovery_code_sets (id, user_id, mfa_factor_id, failed_verification_count, verification_locked_until, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_recovery_codes; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_recovery_codes (id, mfa_recovery_code_set_id, code_hash, consumed_at, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at, expires_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
20260625000000
20260821000000
20260821010000
20260824000000
20260824000001
20260831180000
\.


--
-- Data for Name: scim_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.scim_tokens (id, sso_provider_id, token_hash, prefix, created_at, expires_at, revoked_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: scim_users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.scim_users (id, sso_provider_id, user_id, resource, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: brincadeira; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.brincadeira ("brincadeiraId", nome, descricao, regras, tipo, duracao, status, "pontosPadrao", "criadoEm", "empresaId", "tipoJogo", checkpoints, "eventoId") FROM stdin;
f9de27d6-278c-4a9b-8056-2c158c066951	CaÃ§a ao monstro	Cada equipe tem o seu prÃ³prio monstro de 500 de vida. Percorra os checkpoints atacando o monstro da sua equipe e derrote-o antes das outras.	1- Cada equipe tem um monstro com 500 HP. Todas as equipes jogam ao mesmo tempo.\r\n2- Cada leitura em um checkpoint do jogo Ã© um ataque: 10 de dano em checkpoint normal e 30 no checkpoint especial (marcado pelo administrador ou sorteado).\r\n3- Ataque especial: quando o Ãºltimo integrante da equipe que ainda nÃ£o tinha atacado faz o seu primeiro ataque, o dano Ã© de 50.\r\n4- Depois de uma leitura, aquele checkpoint fica bloqueado para a sua equipe por um tempo de recarga (de 1 a 120 segundos, padrÃ£o de 15).\r\n5- Quando o HP chega a zero, o monstro Ã© derrotado e a equipe vence. O jogo acaba quando todos os monstros forem derrotados ou o tempo se esgotar.\r\n6- Os membros da equipe vencedora ganham 200 pontos ao final.\r\n	monster_hunt	28	\N	\N	2026-08-11 16:43:31.276768-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb	standard	[]	4695594c-19e9-493f-86a9-dfe79941400e
6da6e7f8-0358-41e4-8dcd-253df10242bf	ZONA - INDIVIDUAL	Cada participante joga por si. Conquiste checkpoints com a pulseira, acumule pontos e mantenha o seu nome e a sua cor no mapa. Quem tiver mais pontos no fim do tempo lidera o ranking.	1- NÃ£o hÃ¡ equipes: cada participante disputa por conta prÃ³pria, e o telÃ£o mostra o nome e a cor de quem domina cada checkpoint.\r\n2- Cada leitura vale 10 pontos, com bÃ´nus progressivo: a cada 10 checkpoints lidos, cada nova leitura passa a valer 1 ponto a mais (11, 12, 13...).\r\n3- Ao ler um checkpoint, ele passa a ser seu, mesmo que fosse de outro participante.\r\n4- Para reler o mesmo checkpoint, vocÃª precisa antes ler 3 checkpoints diferentes.\r\n5- O domÃ­nio de um checkpoint nÃ£o expira: ele sÃ³ muda de dono quando outro participante o lÃª, e Ã© zerado no fim do jogo.\r\n6- Uma zona sÃ³ Ã© dominada quando todos os seus checkpoints sÃ£o do mesmo participante. Caso contrÃ¡rio, fica "em disputa".\r\n7- O ranking Ã© por pontos totais. Os pontos ficam salvos ao final.	individual	10	active	\N	2026-08-24 15:14:44.893439-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb	standard	[]	9ba04dda-8cd4-4d44-a37b-3042a0b8519a
b58b6207-7348-40fe-b7fc-432212d08534	CAÃ‡A AO TESOURO	Uma corrida contra o relÃ³gio entre equipes. Uma equipe de cada vez precisa "acender" todos os checkpoints do jogo, sempre lendo o checkpoint-alvo indicado. A equipe mais rÃ¡pida vence.	1- SÃ£o necessÃ¡rias pelo menos 2 equipes com participantes. SÃ³ entram os checkpoints online configurados no jogo.\r\n2- As equipes jogam uma por vez. A primeira Ã© sorteada, e cada vez comeÃ§a apÃ³s 10 segundos de preparaÃ§Ã£o. O cronÃ´metro de cada equipe comeÃ§a quando a sua vez Ã© liberada.\r\n3- Em cada etapa existe um checkpoint-alvo sorteado. SÃ³ ele conta, e sÃ³ a equipe da vez pode lÃª-lo.\r\n4- Todos os integrantes da equipe precisam ler o alvo, e cada crianÃ§a conta uma vez por etapa. Quando o Ãºltimo lÃª, o checkpoint fica com a cor da equipe e um novo alvo Ã© sorteado.\r\n5- A equipe termina quando domina todos os checkpoints do jogo. A vez passa para a prÃ³xima equipe que ainda nÃ£o terminou, e o mapa Ã© limpo para ela recomeÃ§ar.\r\n6- O jogo acaba quando todas as equipes terminam. Vence a equipe com o menor tempo. Se o tempo configurado do jogo se esgotar antes, o jogo Ã© encerrado automaticamente.\r\n7- Os membros da equipe vencedora ganham 200 pontos ao final.	treasure_hunt	18	\N	\N	2026-07-22 08:46:32.493-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb	standard	[]	4695594c-19e9-493f-86a9-dfe79941400e
a456cd5f-cfc3-4e93-96c2-4232578f9ea2	ZONA - EQUIPE	As equipes disputam os checkpoints espalhados pelo espaÃ§o. Encoste a pulseira em um checkpoint para conquistÃ¡-lo para a sua equipe e ganhar pontos. Quando uma equipe domina todos os checkpoints de uma zona, a zona inteira fica com a cor dela. Vence a equipe com mais pontos quando o tempo acabar.	1- Todas as equipes jogam ao mesmo tempo, sem fila nem turnos. Qualquer checkpoint online pode ser lido a qualquer momento.\r\n2- Cada leitura vale 10 pontos para o participante e para a equipe.\r\n3- Ao ler um checkpoint, ele passa a ser da sua equipe, mesmo que estivesse com outra.\r\n4- VocÃª nÃ£o pode reler um checkpoint que vocÃª mesmo jÃ¡ domina. Ele sÃ³ libera quando outra equipe o conquistar, ou depois de 1m30s sem nenhuma leitura, quando volta a ficar livre para todos.\r\n5- Uma zona sÃ³ Ã© dominada quando todos os checkpoints dentro dela pertencem Ã  mesma equipe. Se estiverem misturados ou algum estiver livre, a zona fica "em disputa".\r\n6- O jogo termina quando o tempo configurado acaba ou o recreador encerra. Os pontos ficam salvos e os domÃ­nios sÃ£o zerados.\r\n7- Ã‰ preciso estar com a pulseira ativa, vinculada Ã  sua conta e ao evento, e pertencer a uma equipe.	team	15	\N	\N	2026-08-24 15:15:31.920441-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb	standard	[]	9ba04dda-8cd4-4d44-a37b-3042a0b8519a
\.


--
-- Data for Name: cacaTesourPartida; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."cacaTesourPartida" ("partidaId", "eventoId", "brincadeiraId", status, "numeroRonda", "checkpointAlvoId", "checkpointsCompletadosIds", "iniciadoEm", "rondaIniciadaEm", "finalizadoEm", "timeInicialId", "timeVezId", "vezDisponvelEm") FROM stdin;
a122de43-4936-4303-bea6-720596fa299a	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-15 16:45:08.694-03	2026-09-15 16:50:12.368-03	2026-09-15 16:50:53.422-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
ab9648cc-ccdb-42d1-9da6-f6f076368fd2	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-16 08:17:04.367-03	2026-09-16 08:17:14.367-03	2026-09-16 08:26:48.770859-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-16 08:17:14.367-03
1f10f31f-ec24-49f8-baa6-841c816bf170	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	2	\N	[]	2026-09-21 11:35:34.863-03	2026-09-21 11:35:50.898-03	2026-09-21 11:36:23.748654-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 11:35:50.898-03
7c9e99b9-8192-4983-ab9e-2fc0c84cac52	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	6	\N	[]	2026-09-18 14:35:33.775-03	2026-09-18 14:38:22.698-03	2026-09-18 14:38:29.776-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
17f81928-0042-4527-834d-f7a7ea9b3c3c	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	8	\N	[]	2026-09-03 13:47:35.374-03	2026-09-03 13:50:05.86-03	2026-09-03 13:50:16.806-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
f86e45a6-5d40-47f7-b1b8-6348cba7e212	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-08-31 11:37:59.169-03	2026-08-31 11:38:09.169-03	2026-08-31 11:38:14.365167-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-08-31 11:38:09.169-03
21ea8f11-b6e8-44e3-a87e-bc03783d612f	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	4	\N	[]	2026-09-23 12:21:12.966-03	2026-09-23 12:23:17.024-03	2026-09-23 12:23:27.87-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
04b8bb88-f60a-4258-9fbc-81dff4fefca1	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	6	\N	[]	2026-09-03 13:35:34.138-03	2026-09-03 13:36:45.955-03	2026-09-03 13:36:54.937-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
7b0745d9-ae7f-48fa-9999-9abbd858d205	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 10:01:13.087-03	2026-09-18 10:01:23.087-03	2026-09-18 10:01:26.000984-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-18 10:01:23.087-03
1c46d8c6-1c4c-401c-a739-805afd207eca	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	2	\N	[]	2026-09-25 10:27:59.628-03	2026-09-25 10:28:15.221-03	2026-09-25 10:28:19.317437-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-25 10:28:15.221-03
0bb4b716-98fd-490b-bb1f-fb4a300d2ee1	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-23 16:12:35.065-03	2026-09-23 16:12:45.065-03	2026-09-23 16:16:25.230788-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-23 16:12:45.065-03
c6827569-553a-4829-8dd1-080e750a2960	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	3	\N	[]	2026-08-28 15:42:54.606-03	2026-08-28 15:44:54.844-03	2026-08-28 15:45:20.725-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
fd39ae64-b906-40bd-9a3d-44299fbd95da	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-08-28 16:36:25.073-03	2026-08-28 16:36:35.073-03	2026-08-28 16:37:30.522448-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-08-28 16:36:35.073-03
f4adf239-3eef-4d97-bacb-8e1f0310714e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-02 10:54:15.192-03	2026-09-02 10:54:33.657-03	2026-09-02 10:54:48.418-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
08cce837-1026-42f4-8913-fa8cf50b14b9	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-17 16:22:46.728-03	2026-09-17 16:22:56.728-03	2026-09-17 16:22:51.697436-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-17 16:22:56.728-03
37dd3e56-55ba-4293-b560-d45c8d867705	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-02 11:10:33.942-03	2026-09-02 11:11:00.52-03	2026-09-02 11:11:14.724-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
ad9ae259-9cb1-48c3-8cf6-fbb5f36b7b3e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 10:21:40.004-03	2026-09-18 10:21:50.004-03	2026-09-18 10:23:16.193123-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-18 10:21:50.004-03
9f19ad78-82e9-49e7-8ec7-b8aa78b38f6d	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-16 11:21:04.484-03	2026-09-16 11:22:37.655-03	2026-09-16 11:22:52.601-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
04d1ce30-644e-4a85-ae5e-25cfe34a4406	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-16 10:21:35.845-03	2026-09-16 10:21:45.845-03	2026-09-16 10:21:51.387353-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-16 10:21:45.845-03
0f678e10-5fcb-415c-8b9b-eab192cf4ed5	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-16 11:23:18.176-03	2026-09-16 11:23:32.412-03	2026-09-16 11:23:47.932-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
e43f8055-f804-4daa-ae36-fcd6e2ce3db1	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-25 11:44:26.152-03	2026-09-25 11:44:36.152-03	2026-09-25 11:44:58.257102-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-25 11:44:36.152-03
0d77cb23-da2b-4f56-9a87-f84a9eef3387	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 10:10:41.616-03	2026-09-18 10:10:51.616-03	2026-09-18 10:18:22.926389-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-18 10:10:51.616-03
4c7bd6a3-da58-4efd-b409-adfbe13baa7b	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-23 13:36:34.563-03	2026-09-23 13:36:53.776-03	2026-09-23 13:38:42.36-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
1a07be1b-3cc6-4ae8-bce6-7c168ea5d09a	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-23 17:00:35.233-03	2026-09-23 17:00:45.233-03	2026-09-23 17:16:37.621155-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-23 17:00:45.233-03
a3893b99-24ce-4c41-ac3b-7f22102b2155	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	6	\N	[]	2026-09-03 13:42:12.351-03	2026-09-03 13:43:34.828-03	2026-09-03 13:43:40.251-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
0174e8a0-769f-4ab3-880f-32ba3a73c06c	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 10:35:43.424-03	2026-09-18 10:35:53.424-03	2026-09-18 10:35:49.471797-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-18 10:35:53.424-03
3be2fcf7-68bf-4c0b-b070-ebd7715a8eb1	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-21 13:40:59.458-03	2026-09-21 13:41:09.458-03	2026-09-21 13:41:08.328212-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-21 13:41:09.458-03
8734d474-9b3d-4816-9bcf-3fe779b21e6e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	6	\N	[]	2026-09-18 16:35:14.287-03	2026-09-18 16:36:15.437-03	2026-09-18 16:36:22.824-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
6636fd7c-0723-4bf0-8186-5b93f74d68e3	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-08-28 16:37:39.237-03	2026-08-28 16:37:49.237-03	2026-08-28 16:41:35.487537-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-08-28 16:37:49.237-03
2e184515-3724-4c4f-b07f-8e6e175c2bcd	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-08-31 11:38:42.143-03	2026-08-31 11:38:52.143-03	2026-08-31 11:38:57.569304-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-08-31 11:38:52.143-03
f2391ba4-61bb-442c-8a18-98d227c20b86	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 10:23:40.341-03	2026-09-18 10:23:50.341-03	2026-09-18 10:33:04.942161-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-18 10:23:50.341-03
8fda78da-97bf-4925-93b7-144ef71a2ec6	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 16:32:52.873-03	2026-09-18 16:33:02.873-03	2026-09-18 16:33:00.548117-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-18 16:33:02.873-03
42181ca8-766c-4a05-a97d-57c456ac3101	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-15 16:51:19.977-03	2026-09-15 16:51:29.977-03	2026-09-15 16:51:39.419061-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-15 16:51:29.977-03
e929c5f0-490f-4b83-a689-52892bc15763	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-16 08:26:58.391-03	2026-09-16 08:27:08.391-03	2026-09-16 08:42:31.278083-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-16 08:27:08.391-03
814bc1ff-b7b5-48d0-9f13-34eda1c7a3db	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	2	\N	[]	2026-09-16 08:43:35.773-03	2026-09-16 09:47:15.452-03	2026-09-16 10:10:43.392015-03	a8238112-f78c-4a80-95d3-4d18336f1318	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-16 09:47:25.452-03
1d13ca2d-12d1-4073-81fb-8c5d72402bab	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-02 11:11:23.059-03	2026-09-02 11:11:39.257-03	2026-09-02 11:11:53.484-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
3471bc6c-391c-4f0e-8485-950411e0f139	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-17 17:31:59.868-03	2026-09-17 17:32:09.868-03	2026-09-17 17:32:49.194771-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-17 17:32:09.868-03
c2e2be24-3782-42e0-b71f-a9962da5ae70	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-25 11:44:08.339-03	2026-09-25 11:44:18.339-03	2026-09-25 11:44:21.73585-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 11:44:18.339-03
6ce44061-1f80-4a10-b4b5-1dd2dc4aa92e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	4	\N	[]	2026-09-18 16:47:51.771-03	2026-09-18 16:48:33.482-03	2026-09-18 16:52:00.85787-03	3218d5b4-372e-424e-9d91-dedea2b741f3	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-18 16:48:43.482-03
a6563902-76b3-4b8d-a995-74cd6afb66ea	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-03 17:27:08.341-03	2026-09-03 17:27:18.341-03	2026-09-03 17:39:46.16082-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-03 17:27:18.341-03
2d772826-0d32-42ab-95c7-90534038e5a2	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	12	\N	[]	2026-08-28 17:35:54.173-03	2026-08-28 17:40:03.984-03	2026-08-28 17:40:12.375-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
70ea1475-15d4-4cdd-a68c-e1590dfe55d6	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 09:33:35.587-03	2026-09-18 09:33:45.587-03	2026-09-18 09:40:07.782486-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-18 09:33:45.587-03
b9c2a905-f312-471b-98e5-7b66d90048a6	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-22 17:18:37.213-03	2026-09-22 17:18:47.213-03	2026-09-22 17:18:54.523308-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-22 17:18:47.213-03
fce702ce-51ff-46bf-936e-c3c505af4b82	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-23 13:39:52.898-03	2026-09-23 13:40:02.898-03	2026-09-23 13:48:53.238061-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-23 13:40:02.898-03
fff1b1cf-1a58-42df-aed4-c40398c15f57	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-23 13:48:56.235-03	2026-09-23 13:49:06.235-03	2026-09-23 15:29:02.940238-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-23 13:49:06.235-03
5df2bdfe-ac0f-4a0e-ac0c-88bc37f6830a	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-23 17:16:45.874-03	2026-09-23 17:16:55.874-03	2026-09-23 17:16:53.905043-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-23 17:16:55.874-03
6991cb74-0309-4a7a-812b-b4ab9a926b0b	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	2	\N	[]	2026-09-25 11:45:15.393-03	2026-09-25 11:45:36.362-03	2026-09-25 11:46:36.768754-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 11:45:36.362-03
ffb426c8-80f6-4a5f-a06e-7128ec34bd0b	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-08-31 11:38:59.761-03	2026-08-31 11:39:09.761-03	2026-08-31 11:40:12.473359-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-08-31 11:39:09.761-03
7e377d83-0d7c-41bf-87e9-b800725658ec	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-15 17:00:50.165-03	2026-09-15 17:01:00.165-03	2026-09-15 17:04:10.860787-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-15 17:01:00.165-03
74502c0a-0d06-49a5-9164-ed3cddf4a81f	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-16 10:11:17.192-03	2026-09-16 10:11:27.192-03	2026-09-16 10:13:33.456887-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-16 10:11:27.192-03
974a8efa-94bd-4442-9e5a-dad880c89263	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-16 11:05:48.792-03	2026-09-16 11:06:08.394-03	2026-09-16 11:06:55.868-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
b63b9089-87ce-4be1-8c59-55148b376307	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 11:12:02.8-03	2026-09-18 11:12:12.8-03	2026-09-18 11:12:24.79688-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-18 11:12:12.8-03
3338dc75-405b-4c62-b9c6-ff9ed8148ff8	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-16 11:24:04.931-03	2026-09-16 11:24:41.188-03	2026-09-16 11:24:58.26-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
86a7d9fa-730e-49ec-a99d-277d05a36e49	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-15 17:04:20.099-03	2026-09-15 17:04:30.099-03	2026-09-15 17:06:17.017727-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-15 17:04:30.099-03
22185a19-4ef7-4620-94ea-1ce9fd885b29	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	4	\N	[]	2026-08-31 08:53:49.336-03	2026-08-31 08:57:24.933-03	2026-08-31 08:57:32.082354-03	3218d5b4-372e-424e-9d91-dedea2b741f3	a8238112-f78c-4a80-95d3-4d18336f1318	2026-08-31 08:57:34.933-03
b3af38fd-d459-4e52-abed-1cb75d6dffc1	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	3	\N	[]	2026-09-18 17:19:56.123-03	2026-09-18 17:20:25.072-03	2026-09-18 17:36:52.847602-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-18 17:20:25.072-03
129f05c8-025e-4cc0-a0a2-cba45358e568	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-23 11:32:14.644-03	2026-09-23 11:32:24.644-03	2026-09-23 11:32:21.770193-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-23 11:32:24.644-03
fd5dc4f1-7342-4d51-9de6-49f371615d1a	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-23 15:30:56.384-03	2026-09-23 15:31:06.384-03	2026-09-23 15:36:07.038701-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-23 15:31:06.384-03
af7e20d0-04cb-4415-b79e-6e355edd69cd	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-23 17:17:30.015-03	2026-09-23 17:18:15.929-03	2026-09-23 17:29:31.028-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
67ba47cb-8757-41e6-a885-8ea4b247a951	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	8	\N	[]	2026-08-31 11:40:30.314-03	2026-08-31 11:41:54.87-03	2026-08-31 11:42:01.225-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
7ea064f4-5172-41ba-9e64-c7dc606c7412	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-15 17:06:26.967-03	2026-09-15 17:06:36.967-03	2026-09-15 17:07:27.129766-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-15 17:06:36.967-03
a0daf023-76c0-4618-98b2-ca80a3425276	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	4	\N	[]	2026-09-25 15:52:31.692-03	2026-09-25 15:53:59.242-03	2026-09-25 15:54:16.5-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
7d8ce58e-cd35-4983-beaf-f6950982cb1c	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-16 10:17:20.107-03	2026-09-16 10:17:30.107-03	2026-09-16 10:17:46.394044-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-16 10:17:30.107-03
39ef45e3-0123-4c65-98e2-ebb81bd1f125	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-16 16:41:47.944-03	2026-09-16 16:41:57.944-03	2026-09-16 16:42:07.038679-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-16 16:41:57.944-03
594d824a-2796-4da8-906b-75f1cbc28cef	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 13:33:54.117-03	2026-09-18 13:34:04.117-03	2026-09-18 13:38:15.024584-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-18 13:34:04.117-03
2efcad1b-abc7-4077-b04f-5d1b8706ef5d	4695594c-19e9-493f-86a9-dfe79941400e	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-10-01 14:46:21.302-03	2026-10-01 14:46:31.302-03	2026-10-01 14:53:06.758807-03	aea6e59c-7626-4e57-964a-5bf49620b671	aea6e59c-7626-4e57-964a-5bf49620b671	2026-10-01 14:46:31.302-03
9e1b18d7-1231-41f7-b185-b7a3b563ca51	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	3	\N	[]	2026-08-31 08:13:23.9-03	2026-08-31 08:17:02.689-03	2026-08-31 08:19:41.740557-03	3218d5b4-372e-424e-9d91-dedea2b741f3	a8238112-f78c-4a80-95d3-4d18336f1318	2026-08-31 08:17:12.689-03
ec796731-deb3-4a97-a6c0-905f89aab0ed	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	6	\N	[]	2026-09-18 09:44:59.536-03	2026-09-18 09:46:22.955-03	2026-09-18 09:46:54.21073-03	a8238112-f78c-4a80-95d3-4d18336f1318	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-18 09:46:22.955-03
6e702d66-e2fe-4d38-aecd-c09723483dd6	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 13:41:37.338-03	2026-09-18 13:41:47.338-03	2026-09-18 13:51:00.514491-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-18 13:41:47.338-03
0937c6fe-b82a-4060-a46f-e681a5172216	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-10 13:11:32.605-03	2026-09-10 13:12:33.291-03	2026-09-10 13:13:02.485-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
c1d04bd5-17f0-4e13-b5e0-06fab6adf33f	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-16 10:18:11.856-03	2026-09-16 10:18:21.856-03	2026-09-16 10:18:28.985315-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-16 10:18:21.856-03
5fddce13-dcd4-4663-9d86-63b7b6fc9a06	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-16 10:25:58.103-03	2026-09-16 10:26:08.103-03	2026-09-16 10:27:04.885358-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-16 10:26:08.103-03
02e56e35-4196-4bf9-bc49-8385d548b853	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-29 09:00:46.326-03	2026-09-29 09:00:56.326-03	2026-09-29 09:00:52.379486-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-29 09:00:56.326-03
b524a314-cb8a-425d-9a95-788286d9f008	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 13:59:26.609-03	2026-09-18 13:59:36.609-03	2026-09-18 14:10:50.52981-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-18 13:59:36.609-03
6c88ab81-c0c2-45b1-886b-c4c862af9d83	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-23 15:57:39.888-03	2026-09-23 15:58:04.486-03	2026-09-23 15:58:18.718-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
fca0605e-dfd5-4479-895e-1699b973711e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	2	\N	[]	2026-09-23 16:45:35.449-03	2026-09-23 16:45:59.57-03	2026-09-23 17:00:29.422543-03	3218d5b4-372e-424e-9d91-dedea2b741f3	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-23 16:46:09.57-03
7cdfd7b4-70f4-44ff-9527-63cfdcbf3b52	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	4	\N	[]	2026-09-23 11:32:38.146-03	2026-09-23 11:35:00.104-03	2026-09-23 11:35:12.077-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
b52f378d-3a6d-4f43-a5cd-be8b011437d8	c920334b-c141-47ea-a791-dd2c9828be58	b58b6207-7348-40fe-b7fc-432212d08534	completed	8	\N	["12","15","10","14"]	2026-10-05 13:52:45.815-03	2026-10-05 13:54:06.38-03	2026-10-05 13:54:15.187-03	697df292-ec0f-40e5-97d5-1c77c6e539ff	\N	\N
dabd2c55-a42e-4cd5-a237-444d32d24e47	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	6	\N	[]	2026-09-17 15:35:50.713-03	2026-09-17 15:37:06.626-03	2026-09-17 15:37:13.907-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
d796f0df-9604-4400-957e-93428a715500	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	6	\N	[]	2026-09-18 09:53:33.614-03	2026-09-18 09:54:35.604-03	2026-09-18 09:54:42.452-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
c7e387d3-244e-456b-995f-7a99e1553c7e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 13:56:01.343-03	2026-09-18 13:56:11.343-03	2026-09-18 13:56:42.864255-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-18 13:56:11.343-03
49cbf31c-7f0f-46e9-9c08-20ca3f15ccf3	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	8	\N	[]	2026-08-31 09:34:01.204-03	2026-08-31 09:36:30.344-03	2026-08-31 09:36:45.074-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
04758f1d-f7dd-416a-b4cf-a004cf8ca769	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-02 10:37:15.594-03	2026-09-02 10:38:37.972-03	2026-09-02 10:39:57.076-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
4c6e4e3a-b23c-43ba-9f59-eb802ba3b9dd	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 13:51:06.832-03	2026-09-18 13:51:16.832-03	2026-09-18 13:55:59.383889-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-18 13:51:16.832-03
f6f08415-c73e-4531-82cb-246a425b3c6d	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-15 16:06:27.215-03	2026-09-15 16:06:37.215-03	2026-09-15 16:11:04.722977-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-15 16:06:37.215-03
33c46b7e-6704-401a-99b3-70b0b6d3c245	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-15 17:15:15.246-03	2026-09-15 17:15:25.246-03	2026-09-15 17:15:46.175976-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-15 17:15:25.246-03
b1d59e92-5fe9-48c7-955d-752ff04efce9	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 17:36:54.754-03	2026-09-18 17:37:04.754-03	2026-09-18 17:36:57.742059-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-18 17:37:04.754-03
342fbdf3-a113-4aa3-aed8-1dacc2829c94	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-23 17:29:44.153-03	2026-09-23 17:29:58.867-03	2026-09-23 17:30:15.752-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
5cbc2b6a-3909-4e48-8dae-5e6cef6455ab	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-21 09:13:29.682-03	2026-09-21 09:13:39.682-03	2026-09-21 09:31:32.776267-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-21 09:13:39.682-03
fc372c3f-d5ab-4ff2-a3a6-f2cdbb4cbf25	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-29 16:26:44.417-03	2026-09-29 16:26:54.417-03	2026-09-29 16:26:51.843265-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-29 16:26:54.417-03
002f0d59-a8c2-4d41-9f12-5626fd0e27e9	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	2	\N	[]	2026-08-31 09:45:12.556-03	2026-08-31 09:45:44.378-03	2026-08-31 09:46:06.001062-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-08-31 09:45:44.378-03
40903033-5cd1-4ffb-9f94-1ed2f9fb9f40	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-17 16:14:07.171-03	2026-09-17 16:14:17.171-03	2026-09-17 16:14:13.957538-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-17 16:14:17.171-03
7b502969-e309-4aca-a014-ee4ca0d3070b	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 09:56:43.327-03	2026-09-18 09:56:53.327-03	2026-09-18 09:56:47.600927-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-18 09:56:53.327-03
205ff02f-7cc7-48ed-9d1c-c7bf7f42e72d	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-23 17:45:47.771-03	2026-09-23 17:46:08.477-03	2026-09-23 17:46:25.382-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
b1aa251f-14be-4573-9075-c9fe9204f347	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	3	\N	[]	2026-09-23 11:36:56.396-03	2026-09-23 11:38:20.795-03	2026-09-23 11:42:35.314632-03	a8238112-f78c-4a80-95d3-4d18336f1318	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-23 11:38:30.795-03
c133625e-bd20-468f-9f3b-d8364b02f7e1	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-23 16:02:57.44-03	2026-09-23 16:03:07.44-03	2026-09-23 16:02:59.860136-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-23 16:03:07.44-03
dea288c1-e3ff-4a84-9733-383639d00389	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-23 16:38:50.544-03	2026-09-23 16:40:43.054-03	2026-09-23 16:45:30.709-03	3218d5b4-372e-424e-9d91-dedea2b741f3	\N	\N
3168960b-0e10-446b-88c7-bd898ff9d6e5	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	2	\N	[]	2026-09-18 14:19:23.663-03	2026-09-18 14:19:58.637-03	2026-09-18 14:23:22.760722-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-18 14:19:58.637-03
5d8c8b0e-7077-442b-9da8-162566006264	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	completed	2	\N	[]	2026-09-02 10:52:50.939-03	2026-09-02 10:53:08.463-03	2026-09-02 10:53:26.235-03	a8238112-f78c-4a80-95d3-4d18336f1318	\N	\N
ac392b27-6f71-4c5d-aa22-215440a84ef2	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 10:08:24.106-03	2026-09-18 10:08:34.106-03	2026-09-18 10:10:39.536213-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-18 10:08:34.106-03
treasure-9ba04dda	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-08-28 15:26:55.328-03	2026-08-28 15:26:55.328-03	2026-08-28 15:42:46.829345-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-08-28 15:26:55.328-03
008c38f8-1633-4428-aa3e-8998b4adc0a3	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-15 16:32:14.293-03	2026-09-15 16:32:24.293-03	2026-09-15 16:44:59.474498-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-15 16:32:24.293-03
b60e7cd4-4d9f-4887-bfb9-271b13b34882	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-15 17:16:02.18-03	2026-09-15 17:16:12.18-03	2026-09-15 17:16:32.659236-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-15 17:16:12.18-03
5c198983-6505-4a0f-a121-0b99960b9071	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-16 11:16:06.289-03	2026-09-16 11:16:16.289-03	2026-09-16 11:16:16.622309-03	a8238112-f78c-4a80-95d3-4d18336f1318	a8238112-f78c-4a80-95d3-4d18336f1318	2026-09-16 11:16:16.289-03
56f3c18b-32c7-4070-8250-12400159a5d9	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	finished	1	\N	[]	2026-09-18 14:17:20.243-03	2026-09-18 14:17:30.243-03	2026-09-18 14:19:21.06656-03	3218d5b4-372e-424e-9d91-dedea2b741f3	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-18 14:17:30.243-03
\.


--
-- Data for Name: cacaTesourScan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."cacaTesourScan" ("scanId", "partidaId", "eventoId", "brincadeiraId", "numeroRonda", "checkpointId", "criancaId", "timeId", uid, "leroEm") FROM stdin;
5069e714-6235-4eb2-9d05-20289df43ffb	b52f378d-3a6d-4f43-a5cd-be8b011437d8	c920334b-c141-47ea-a791-dd2c9828be58	b58b6207-7348-40fe-b7fc-432212d08534	1	15	b3ee6536-ebd0-431d-b106-4ebde945cc9b	697df292-ec0f-40e5-97d5-1c77c6e539ff	04F0B45ABB2190	2026-10-05 13:52:58.349-03
3926b2d0-16eb-4fdf-9dd1-84c0e13c9c0c	b52f378d-3a6d-4f43-a5cd-be8b011437d8	c920334b-c141-47ea-a791-dd2c9828be58	b58b6207-7348-40fe-b7fc-432212d08534	2	12	b3ee6536-ebd0-431d-b106-4ebde945cc9b	697df292-ec0f-40e5-97d5-1c77c6e539ff	04F0B45ABB2190	2026-10-05 13:53:07.954-03
afe7314a-99a0-4325-a5b8-7fb2dc6bb226	b52f378d-3a6d-4f43-a5cd-be8b011437d8	c920334b-c141-47ea-a791-dd2c9828be58	b58b6207-7348-40fe-b7fc-432212d08534	3	14	b3ee6536-ebd0-431d-b106-4ebde945cc9b	697df292-ec0f-40e5-97d5-1c77c6e539ff	04F0B45ABB2190	2026-10-05 13:53:18.269-03
e7047b30-ff15-4cff-8657-d670503c4a40	b52f378d-3a6d-4f43-a5cd-be8b011437d8	c920334b-c141-47ea-a791-dd2c9828be58	b58b6207-7348-40fe-b7fc-432212d08534	4	10	b3ee6536-ebd0-431d-b106-4ebde945cc9b	697df292-ec0f-40e5-97d5-1c77c6e539ff	04F0B45ABB2190	2026-10-05 13:53:28.308-03
f5c28659-76ae-4292-a285-55f1c0709228	b52f378d-3a6d-4f43-a5cd-be8b011437d8	c920334b-c141-47ea-a791-dd2c9828be58	b58b6207-7348-40fe-b7fc-432212d08534	5	12	d70cac9b-1fb5-4444-a350-a6fadc61c300	3e781f1a-bd88-426c-b2de-d47f2489cc65	0455525ABB2190	2026-10-05 13:53:48.379-03
3382f10e-90d4-490f-8f06-c397e506b336	b52f378d-3a6d-4f43-a5cd-be8b011437d8	c920334b-c141-47ea-a791-dd2c9828be58	b58b6207-7348-40fe-b7fc-432212d08534	6	15	d70cac9b-1fb5-4444-a350-a6fadc61c300	3e781f1a-bd88-426c-b2de-d47f2489cc65	0455525ABB2190	2026-10-05 13:53:57.294-03
1470d233-ff88-44c9-a664-be6bc4bc368a	b52f378d-3a6d-4f43-a5cd-be8b011437d8	c920334b-c141-47ea-a791-dd2c9828be58	b58b6207-7348-40fe-b7fc-432212d08534	7	10	d70cac9b-1fb5-4444-a350-a6fadc61c300	3e781f1a-bd88-426c-b2de-d47f2489cc65	0455525ABB2190	2026-10-05 13:54:06.38-03
ac93019b-e455-45e1-ae7d-a84b07c34243	b52f378d-3a6d-4f43-a5cd-be8b011437d8	c920334b-c141-47ea-a791-dd2c9828be58	b58b6207-7348-40fe-b7fc-432212d08534	8	14	d70cac9b-1fb5-4444-a350-a6fadc61c300	3e781f1a-bd88-426c-b2de-d47f2489cc65	0455525ABB2190	2026-10-05 13:54:15.187-03
\.


--
-- Data for Name: chamadoSuport; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."chamadoSuport" ("ticketId", "empresaId", cliente, assunto, status, prioridade, descricao, "atribuidoPara", "criadoEm", "atualizadoEm") FROM stdin;
\.


--
-- Data for Name: cliente; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cliente ("clienteId", nome, cidade, estado, email, telefone, plano, status, "eventosRealizados", "ultimoAcesso", "criadoEm", empresa_id, address, backup_frequency, logo_data, logo_name, logo_type) FROM stdin;
4e73b030-1bb1-4efc-b339-2cf7c5afc46b	buffet alegria	embu	sp	admin@buffet.com.br	1199584756	starter	active	0	\N	2026-07-13 13:15:24.7-03	\N	\N	daily	\N	\N	\N
8073e548-eb4c-469b-b028-7b21f4c373a6	Buffet Teste	SÃ£o Paulo	SP	teste@buffet.com	(11) 99999-9999	starter	active	-13	\N	2026-06-11 08:58:43.997-03	\N	\N	daily	\N	\N	\N
c87ce8a4-ad3a-476f-b574-c9cc1cb97dcf	buffet maria das rosas	embu	SP	teste@gmail.com	11998456789	starter	active	0	\N	2026-07-13 12:31:33.933-03	\N	\N	daily	\N	\N	\N
cliente-teste-1	Pullyn Teste	Cotia	SP	teste@teste.com	11999999999	starter	active	-5	\N	2026-07-08 12:40:12.897-03	\N	\N	daily	\N	\N	\N
9122bde4-634d-4d45-b69b-5ff6ede4a7fd	Buffet ADV	taboao	sp	contato@advbuffet.com	(11) 99487-5644	starter	active	0	\N	2026-07-15 12:31:54.113-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb	Rua Varicano 121, Cotia	daily	data:image/jpeg;base64,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	Logo teste.jpg	image/jpeg
\.


--
-- Data for Name: codigoVinculoFamiliar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."codigoVinculoFamiliar" (id, crianca_id, evento_id, empresa_id, qr_code_value, tracking_url, status, created_at, expires_at, used_at, used_by_login_id) FROM stdin;
\.


--
-- Data for Name: configuracao; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.configuracao ("settingId", setting_key, setting_value, updated_at, empresa_id) FROM stdin;
\.


--
-- Data for Name: conquista; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conquista ("conquistaId", nome, descricao, icone, cor, "tipoRequerido", "valorRequerido", "pontosBonus", "criadoEm") FROM stdin;
\.


--
-- Data for Name: conviteFamilia; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."conviteFamilia" ("conviteId", "empresaId", "eventoId", "criancaId", email, "hashToken", status, "expiramEm", "usadoEm", "criadoPor", "criadoEm") FROM stdin;
c4cde193-d125-4f4c-8456-38e6e4c56fc9	c9287e4b-399d-4764-8bff-2e0ce7058dcb	cb2c9907-c412-4cf3-9b36-59b41e5e9d0b	\N	\N	f4f8c18990c58d3b88fa23f252ff0ae78f0ae4f33f1bd739bfe4f90dffbd8005	used	2026-08-04 13:51:52.197-03	2026-07-28 13:53:33.214865-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-07-28 13:51:52.202309-03
10c52790-0c63-4164-aecd-971680f434f4	c9287e4b-399d-4764-8bff-2e0ce7058dcb	cb2c9907-c412-4cf3-9b36-59b41e5e9d0b	\N	\N	44b204109d79d4f65d8b7e839e68ec92ac0127e9219c13f5c584e0254387e7f8	used	2026-08-04 13:58:26.908-03	2026-07-28 13:59:29.180995-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-07-28 13:58:26.912993-03
08b8f604-2a51-4b0e-b3d4-a5fa5b69b43c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	5d48ad75b5c1c29f1aa54918319bf6aa398800545f73bd796dc21f999fb052c4	used	2026-09-08 11:49:49.623-03	2026-09-01 11:50:26.233279-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-01 11:49:49.620808-03
ea6da151-7889-4380-8b3b-57a2d03b1fc5	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	0c2b72faad47678903ca3c96e9feb0ade7015e6133e1ae5be7ed079dd7c6aa35	pending	2026-09-29 11:38:26.505-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 11:38:26.502095-03
11f94821-6d1f-4b17-b495-3b6fca7c84de	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	e8b9ffbd6a499945e2c936d922e9a957184ddc0a91c148c3a38ea72c1572602a	pending	2026-09-29 11:49:38.319-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 11:49:38.317929-03
79279597-cede-4411-a1d2-bb76bb44c70e	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	270a8c2bcffb2b21465323083ca3fed0daeb48c45b333f5a1b1d7137f019e298	pending	2026-09-29 11:57:03.861-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 11:57:03.860997-03
f602def9-9fdd-4b8f-901c-2c0db8621540	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	f30897524773c716a72c2210ae4cb667219d8f82be28c161a0c2899fa7bbdc0a	pending	2026-09-29 12:07:41.883-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 12:07:41.882677-03
1879650c-f51d-41b1-9f60-7528597a3ade	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	4e2c865d28ba59d4dd4d528890efaa3f4a2c9dd5bae131b3e83256eeab9272e2	pending	2026-09-29 12:08:58.291-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 12:08:58.291136-03
35fb606f-08e0-4273-9934-a8e34db057e5	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	631025753b66df29252b53d35c2ea5abe4ce33a931d92f51e95d2fb8549c6a88	pending	2026-09-29 12:10:09.954-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 12:10:09.954117-03
379a8e14-e8f8-495a-b73b-d4b7f143a16b	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	450c761dc90c5a540854385ac5736bdd48a808dff1df9740392168bde4544e82	pending	2026-09-29 12:10:10.241-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 12:10:10.240872-03
46b5d412-d5b3-451a-8df3-9711ce359a72	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	4ee6b006afac5d33b22048b516baef8701089ba9169abc20a966bd382148406b	pending	2026-09-29 12:16:00.984-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 12:16:00.983777-03
2d5551f9-6536-4400-8370-3663eaaa1717	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	f07c3bbf3fc9c324930abe8c91914d64adc87dcd81c3b7d8dc8c63227ad38ffc	pending	2026-09-29 13:41:41.179-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:41:41.179611-03
52b647e9-e245-49a7-8065-ea0ae1cdbad2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	a2d5a3760563e2dd10e8b48b5400b1f44b24e72263959abac8b075fc43e65bad	pending	2026-09-29 13:44:05.217-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:44:05.217947-03
5a3b35ab-75f3-4a37-800e-4e55f9689efb	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	05f529b87b83818d33372256e7abe394c37516dd1afb7ff9ef8f71f4a6f1a01f	pending	2026-09-29 13:44:05.818-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:44:05.819403-03
84f6b36e-383d-4087-82a9-f5e3c5f81bd2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	b1a0b2a9188d32868c45f5e84238e4c613075d8dde740223b372ee54c1abe145	pending	2026-09-29 13:44:05.985-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:44:05.986718-03
c439245c-8f4b-4d2c-b176-801c45d14a77	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	56b54a559d357336dae97c7190ef3248a1423540e0e14ce223a736d88c9d99c8	pending	2026-09-29 13:44:06.133-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:44:06.13392-03
b2f17967-f734-43be-a465-966f48fc9bd0	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	b784cc01f5a8b7ce3c75e3346f7e0c30be7200799dbbdcc8c1d3cc88f2dc27b1	pending	2026-09-29 13:44:06.314-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:44:06.315079-03
9ff28b5a-c064-4885-abf9-a11f402561e3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	16f23011f20ec2100d8842fa968bad1c411efb5ff312d9c396ab4f4bd4a3189c	pending	2026-09-29 13:44:06.752-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:44:06.7535-03
952f0e1c-8f5b-47ba-8cac-57bf6d38c32b	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	2584a99db166b3df08c857f88eccb51f509a52300cae3ae77a79b233f636a328	pending	2026-09-29 13:44:08.284-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:44:08.284961-03
d897399f-d8a7-43a1-b66f-300bdbfa53fb	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	58e2f2656b146c3df2fed4f173a976b47fcef535bfce8d1105f7497b49862233	pending	2026-09-29 13:44:08.46-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:44:08.461533-03
4ac9f000-bdff-40b8-89cb-6c33b3a77f61	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	f2fbdf8369a56546ecb0e70459828be9903d71e8a2a53123c9881a7bdb80ae2b	pending	2026-09-29 13:44:08.633-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:44:08.634411-03
f9af4faf-923b-4d7a-aece-15c018219de8	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	57db0af9cae0db59e1573cf926e29c650b53916219271f8bde287972ecb925e0	pending	2026-09-29 13:44:28.321-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:44:28.322287-03
a4aeae34-a150-405d-a5a2-8a74bb4974f0	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	a644c278c5b6ef1b6fe5ab5ff718e1fdbfee2fdaab9c2902d29609b819ac2eac	pending	2026-09-29 13:46:26.74-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:46:26.741942-03
92d3078b-441b-4643-bec0-947c75877127	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	0816cfc88fdf010d7e62ee472526bc27019d4a238f76a031e8f3c4706bc5f003	pending	2026-09-29 13:46:37.053-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:46:37.055065-03
d6014561-9e33-4ce0-acbb-966d02989c53	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	546dae456e83b9e57ae1381fca66f1a421d4a7c355ba2642df72cf988a0c2939	pending	2026-09-29 13:47:04.168-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:47:04.170226-03
3141025f-c462-4bd1-abc9-813f339deea6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	1e70dd819a381de0101cf6fa987c35909161587d66982453724d618914f5c0ea	pending	2026-09-29 13:47:06.601-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:47:06.603306-03
c2b7f384-13ef-4fc8-9bec-26e2eb12c266	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	f8c86b9959f0ea4e47f3839930101b99b997616e2f5b96098de5718471896906	pending	2026-09-29 13:47:06.772-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:47:06.773618-03
f7457957-6e0f-4aa7-acd7-1505a20b83eb	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	8869df885ae8032ad8b289c38cdca6d41e377939d3906bc9740591a24ad3285b	pending	2026-09-29 13:51:20.767-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:51:20.768787-03
8293b90c-3f9e-4441-8481-05b8a603f474	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	54fc1f9850f7685b4ef2646aad3a17212c1241feb6e25663b777fa3b9066d147	pending	2026-09-29 13:51:26.05-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:51:26.052268-03
85f1f92b-3735-4cdd-965c-e8387de94152	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	e7f8666bb0eaa593bd400f0149f9c3017e0407769dd32f6aea0f1eb28d0f4e90	pending	2026-09-29 13:51:26.695-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:51:26.697118-03
b8ff40dc-e35a-40b6-9bba-caac06a19ba2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	01db86693a6519168717d1b2a3abd3d1944828fc90db81acc0238489ab83a6b4	pending	2026-09-29 13:51:27.096-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:51:27.097459-03
236a1d63-725a-4a2c-bfdf-10d5e95fad45	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	7526fc81c02056887ab6a703fcbbd8ae19dcd8b98ba393bc1f440319961c8348	pending	2026-09-29 13:46:48.63-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:46:48.6312-03
7d43dcca-227a-4404-9059-991a548a11c9	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	4fb069b7afb5884602fd1066f30f6c12f36239e09249eee3a8e0a154cd53d740	pending	2026-09-29 13:46:48.948-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:46:48.949072-03
d2b8787e-5e98-4f4e-86bc-5a402dcb2c87	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	0c4829b41b8b7f39cc2092f5df5a66dcbe9d81775d4d04fb263782cc4991493d	pending	2026-09-29 13:46:49.503-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:46:49.503974-03
f25f07c9-8d58-487e-bcc2-2990bde8b63a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	edf63b8f3752df678f0d8dc986d3182103a10a6e01a644f8aea06cb899ce0bef	pending	2026-09-29 13:48:17.942-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:48:17.9434-03
184f4703-2fef-4d96-aea8-0414f90b46ef	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	40199324df1dafa620d989fdcfcebb6002c667f0ebb2a211fb56945fe131dfd2	pending	2026-09-29 13:48:20.357-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:48:20.358985-03
750c49e2-c20a-4ede-b398-66e8486d6f62	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	fecc5811a9dbdae91c8c7f867d349315b05823fda31421fd037e533a96f3756b	pending	2026-09-29 13:48:20.528-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:48:20.530149-03
5dec54cf-6498-4d44-85a1-255be2a78283	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	39dff51c5529e033c3afbcfcc2330790765c11f92ee87e6ac9a3981889b5e80d	pending	2026-09-29 13:49:06.701-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:49:06.70294-03
25d1ae3a-7e4a-4723-adeb-adf14dd6f15a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	55d3b6bf606a14f75facf58f544171ad83c69a0e2345bf9375aaab3c12c10d2b	pending	2026-09-29 13:53:31.02-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:53:31.021814-03
16de2041-8b05-4136-83d5-6d0f5ed1672a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	db34c0af19ea6718d734dc07920325b040d6ddae3f6c6e176f2545a34bc48ff1	pending	2026-09-29 13:53:31.999-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:53:32.000988-03
24591248-a352-4f7d-9ca5-4b9033456ad7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	9bcdd34e817d7a788927f0e062b7482afc0c995f370ca0207df4b00f67c04d62	pending	2026-09-29 13:54:08.333-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 13:54:08.335708-03
ab7ba0f5-90c0-4d18-9811-70efb5a873a5	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	dcf57f1db3f421445387ce814472be079620746f2d28a12d2543d01549f00aea	pending	2026-09-29 14:05:08.264-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 14:05:08.263963-03
6bcde342-9cd9-45c6-84fb-31dbca4819dc	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	d6a8b4183d8d2d9496686bf9a918313ffc4e971ff547fadb1295fa154f430ca7	used	2026-09-29 14:34:34.982-03	2026-09-22 14:35:15.228074-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 14:34:34.979204-03
3e085d6f-80e3-47d0-8bad-7dc334cb5dbf	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	af6c2eb50b640353753a84e22d86e03645dd614b604a7209f150ea7626ec3bbe	used	2026-09-29 14:07:48.795-03	2026-09-22 14:19:08.796216-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 14:07:48.794078-03
44e70f72-be03-4dd0-9216-d1a45b28ee8b	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	19e28779988f49e029991e44e6252c8326ff49620f91ef60f9d354453889c578	pending	2026-09-29 14:19:44.607-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 14:19:44.60325-03
800dc06f-96c2-4b46-baa3-d82559be697f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	470379ae8ef848546055423fbc04ed7ac5b8f201de51a6519407df8ec04a35d0	pending	2026-09-29 14:19:44.72-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 14:19:44.717253-03
6c753a10-a033-4529-8bc5-ec625001d1cc	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	38f43cdbafe71b1c6e2ab07c5b0e0e885f01fe9202743eaf02b75bf2fb054e46	pending	2026-09-29 14:19:44.727-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 14:19:44.724302-03
bc2c7f4c-8def-4c09-90f8-ca9dd20e17db	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	8aeb00e39a6f76524bf02a7efc7a0154bfc880252ecb3e3dc67aec8dbb875617	pending	2026-09-29 15:37:52.566-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 15:37:52.567687-03
2e05b471-359b-44e8-9fe2-02cd70b593cb	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	34316ecc115b1c9ea1b6d454805cf6f4f9d4afdaabe85a436ddfd892792254b4	used	2026-09-29 14:19:44.866-03	2026-09-22 14:21:10.048508-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 14:19:44.862695-03
1b3c0e93-3de8-4869-951c-69de34f3b6aa	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	96e03ce6263d0cca830126ee60e086b7398bf5218385f07d7119ba19bd07ea53	pending	2026-09-29 14:30:56.374-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 14:30:56.370608-03
0ad0f725-bc14-4157-9eb1-ed5ff95b7e10	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	cc80fb168c81d0c3de82d5234a5753b1765773401c72c9e27ef7af57f1b52a17	pending	2026-09-29 14:30:56.793-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 14:30:56.794131-03
6a7d0011-d109-4098-9d82-ddd71a3fcb62	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	2ebe7b0c5e69092796f08c0dba0528623e2a8b2a363e63daecf39970b318c8be	pending	2026-09-29 15:43:40.773-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 15:43:40.77383-03
8e97f054-ce57-48de-b7d9-f5e65fd83080	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	88047626e67de5621369cd92bed8c71c067596c3777ed6957c52ef994e3dc5ed	used	2026-09-29 14:30:58.435-03	2026-09-22 14:32:29.770693-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 14:30:58.431134-03
5b964066-cd77-473b-a4d3-7f4babf3afb3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	f797dae98689f7ac93141d639470a672797bfc9d2046c2175e032a3bb5287983	pending	2026-09-29 15:43:45.17-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 15:43:45.171191-03
2654ec74-96d1-45b0-b50a-8c5123afb288	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	6e94e13b9d1fffe1b6db478be23f58aa8ff64902278ddb3e2c7adc79b5a9731f	pending	2026-09-29 15:43:45.694-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 15:43:45.695067-03
54a9f388-4b86-4ffc-a31f-c93b29442e10	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	ee9ffe8e9ba5ee24cefe9dc05301fd3cf668ea4d4cab0a3d326ba24077994e0e	pending	2026-09-29 15:43:46.655-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 15:43:46.656116-03
bc0bd120-2a7d-469c-9297-f6c60487fcf1	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	55c02e5e5de80263b94e633ac2b636400bd58b482da3ee4c4c0803a747f80167	used	2026-09-29 15:43:46.966-03	2026-09-22 15:45:39.560618-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 15:43:46.967276-03
aff1e271-0745-4e31-8ddb-5e7f99b9b87a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	6f3e13752399b1a47fb438fb2338b36278a2d1d05b86d1d6461910ef2d5ec995	pending	2026-10-06 16:55:44.616-03	\N	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-29 16:55:44.617193-03
e2813d6d-2f32-4d23-8a66-097e4ffbbe22	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	c0ee2d86fb670e3f58701af12e3ecdc040943a300a11f914d5b977e59ef5007d	used	2026-10-02 15:34:29.378-03	2026-09-25 15:36:52.081607-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-25 15:34:29.374741-03
828e2fdc-4711-446f-bce8-5560540f1fb7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	1e96586a2d79ef9283d379dd7997544c0258bffd7b8aec9c5cea7996453ce52b	used	2026-10-06 10:17:26.735-03	2026-09-29 10:18:52.502552-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-29 10:17:26.738763-03
1b797acb-0b7f-42f2-aaaf-8c5363fcd6f2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	c409077e8d017a24e93b47c888279d240cdf6fc11bda799b3e8f0576a6771661	used	2026-10-06 17:05:20.428-03	2026-09-29 17:07:22.515542-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-29 17:05:20.428457-03
e0b9cf64-089d-4ad0-b3f8-8858d37d9bba	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	\N	50bb2ac032f42f14db0f7eb3142e1e15712df89b47dd424f8db2f8052eba416e	used	2026-10-06 17:18:40.145-03	2026-09-29 17:20:12.666931-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-29 17:18:40.144149-03
b40df15b-2eb9-4919-87fd-053e4b3b4bf8	c9287e4b-399d-4764-8bff-2e0ce7058dcb	909bb418-82c5-4461-869e-72bc9bfbb3aa	\N	\N	7f7866541625c3f5d5a5106af3f9885152ca7fe2e8d7abe3f0e266ee9ee62093	used	2026-10-09 12:19:09.821-03	2026-10-02 12:19:49.434683-03	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-10-02 12:19:09.825373-03
\.


--
-- Data for Name: crianca; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.crianca ("criancaId", "eventoId", "timeId", nome, apelido, idade, avatar, "codigoPulseira", pontos, status, "criadoEm", "empresaId", qr_code) FROM stdin;
\.


--
-- Data for Name: criancaConquista; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."criancaConquista" ("criancaId", "conquistaId", "desbloqueadoEm") FROM stdin;
\.


--
-- Data for Name: empresa; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.empresa ("empresaId", nome, cidade, estado, telefone, plano, status, "dataCriacao", "dataAtualizacao", latitude, longitude, cnpj, floor_plan_data, floor_plan_name, floor_plan_type, zones_data) FROM stdin;
empresa-001	Buffet Teste	\N	\N	\N	professional	active	2026-10-05 13:51:25.992372-03	2026-10-05 13:51:25.992372-03	\N	\N	\N	\N	\N	\N	\N
61bc768f-c5c0-45c3-9696-f551c4b6ebce	Master Admin	\N	\N	\N	enterprise	active	2026-07-15 12:19:36.343-03	2026-07-15 12:19:36.343-03	\N	\N	\N	\N	\N	\N	\N
01afb92b-5ad2-4823-8341-d9f821d210db	walisson's Family	\N	\N	\N	family	active	2026-09-22 10:38:52.067384-03	2026-09-22 10:38:52.067384-03	\N	\N	\N	\N	\N	\N	\N
c9287e4b-399d-4764-8bff-2e0ce7058dcb	Buffet ADV	taboao	sp	(11) 99487-5644	starter	active	2026-07-15 12:31:54.103-03	2026-10-05 11:22:39.053432-03	\N	\N	47007102000100	data:image/jpeg;base64,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YjjuUpEEWrw+lrqGWhqqeKallYYnwvaC1zToWkbrWWqowTDqukgo6iihlpqdzHxRubdsbmEFhHMQQLc1lPRBCZhFBFicuKR0kLK6aNsUk4aM72NJygniBc2ULaDY/ANqmRtxvCaSu5K5jdKy7o778rt49RV0iDnMA2B2f2VxGWuwShbh5mhbDJDAS2J+Umzi3cX6kZt5G8rdtBsRs5tXJFLjmDUdfJEC1j5Wd0Gne241IPEHRXqIIrMPpI6AYeymibSCPkuRa0BgZa2W3NbSyyo6GloKKKhpYGQ0sLBHHE0Wa1oFgAOaykIgjYfh9LhVFDQ0NPHT00DQyOKMWaxo4AcyoKX7mWxlDiDMRptmsMirGSmZs7IQHteTfNfnvc3XUIggYvguG7QUL6HFaGnrqV/fRTsD2npsePSoGAbC7M7LTPnwbBaOime3K6ZjLvLebMbm3RdXyIItTh1JWVFLU1FPFLNSPL4HubcxOLS0lvMbEj1rZU00FZTyU9TFHNDI0tfHI0Oa4HgQdCFuRBzWD/c42RwCtFfhmz+H0tUAWtlZHqwHeG370dAsrrEMMo8UiZFW00VQyOVkzGyC4a9pu1w6QQCFLRBGqsPpK18ElRTxSvp38pE57QTG61szeY2JXkuG0k1dBXyU8bqqnY6OKYtu5jXWzAHhfKPkUpEFXj2zODbUUraTGsMpa+FrszWzsDsh52neD0ha8A2RwHZeORmC4TSUPKG73RMs55/tOOp9ZVwiCHR4VQ4fUVVRSUsUM1ZIJah7G2MrgAAXHibAD1L2DDaOmramuhpo46qryieVrbOlyizcx42BNlLRAK52g+59snhmKHFaLZ7DYK9znPNQyBokzON3G/Akn6V0SIIcmFUM2IQYlJSxvrKdjo4Zi27o2utmDTwvYX8y9qMLoqurpayopopKijc51PI5ozRFwyuLTwuNFLRBRYnsTs3jOKQ4tiOC0VVXwFpZPJGC4ZTdt+ex1F72VjW4VQ4lJSyVlLFO+klE8Be2/JvAIDhzGxPyqYiCHiGF0WKsjjrqWKobFK2ZgkbfLI03a4cxB1BUwIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIg//Z	Planta teste.jpg	image/jpeg	[{"id":"1","name":"Entrada","color":"#1E9BD7","x":50,"y":20,"width":120,"height":80},{"id":"2","name":"Ãrea Verde","color":"#22C55E","x":200,"y":20,"width":200,"height":150},{"id":"3","name":"Ãrea Azul","color":"#1E9BD7","x":50,"y":130,"width":120,"height":120},{"id":"4","name":"Ãrea Central","color":"#F59E0B","x":200,"y":200,"width":200,"height":100}]
\.


--
-- Data for Name: etiquetaCheckpoint; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."etiquetaCheckpoint" ("tagId", "checkpointId", "tagUid", "criadoEm") FROM stdin;
\.


--
-- Data for Name: evento; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.evento ("eventoId", "clienteId", nome, descricao, data, hora, duracao, status, "exibirDisplay", "exibirLocalizacao", "criadoEm", "empresaId", "tipoJogoAtivo", "brincadeiraAtivaId", "dadosPlanoPiso", "nomePlanoPiso", "tipoPlanoPiso", zones_data, "nomeResponsavel", "iniciadoEm", "finalizadoEm", "autoInicio", "autoFim") FROM stdin;
1D7AA6F2-1438-4813-B4ED-4039AC985536	8073e548-eb4c-469b-b028-7b21f4c373a6	Evento Teste	Evento para teste do sistema Pulyn	2026-07-12	11:00:00	120	scheduled	1	0	2026-07-13 09:20:01.19-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	0
evento-teste-1	cliente-teste-1	Evento RFID Teste	Teste de conquista de territÃ³rio	2026-07-07	07:00:00	60	scheduled	1	1	2026-07-08 12:40:59.463-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	0
9ba04dda-8cd4-4d44-a37b-3042a0b8519a	\N	rtrt		2026-09-29	17:25:00	5	finished	1	0	2026-07-16 07:22:01.59-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb	none	\N	data:image/jpeg;base64,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	Captura de tela 2026-09-02 122238.png	image/jpeg	[{"id":"1","name":"Entrada","color":"#1E9BD7","x":-22,"y":14,"width":218,"height":118},{"id":"2","name":"Ãrea Verde","color":"#22C55E","x":200,"y":20,"width":269,"height":151},{"id":"3","name":"Ãrea Azul","color":"#1E9BD7","x":-21,"y":133,"width":221,"height":175},{"id":"4","name":"Ãrea Central","color":"#F59E0B","x":201,"y":170,"width":269,"height":136}]	LÃºcio da Silva	2026-09-29 17:25:07.345112-03	2026-09-29 17:30:11.093647-03	1	1
cb2c9907-c412-4cf3-9b36-59b41e5e9d0b	\N	Buffet Teste		2026-07-30	08:00:00	240	finished	1	0	2026-07-28 11:57:26.955509-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb	none	\N	\N	\N	\N	\N	\N	2026-09-29 17:45:13.264607-03	2026-09-29 17:45:27.469247-03	0	0
909bb418-82c5-4461-869e-72bc9bfbb3aa	\N	Festinha do Lulinha		2026-10-03	09:00:00	320	finished	1	1	2026-10-02 11:51:17.554364-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb	none	\N	\N	\N	\N	[{"id":"1","name":"Entrada","color":"#1E9BD7","x":50,"y":20,"width":120,"height":80},{"id":"2","name":"Ãrea Verde","color":"#22C55E","x":200,"y":20,"width":200,"height":150},{"id":"3","name":"Ãrea Azul","color":"#1E9BD7","x":50,"y":130,"width":120,"height":120},{"id":"4","name":"Ãrea Central","color":"#F59E0B","x":200,"y":200,"width":200,"height":100}]	O jogo terminou. Confira o ranking!	2026-10-02 11:51:21.856865-03	2026-10-02 17:11:31.779926-03	1	1
4695594c-19e9-493f-86a9-dfe79941400e	\N	Anivers Marta		2026-10-01	11:30:00	500	finished	1	0	2026-07-15 12:36:55.247-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb	none	\N	data:image/jpeg;base64,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YjjuUpEEWrw+lrqGWhqqeKallYYnwvaC1zToWkbrWWqowTDqukgo6iihlpqdzHxRubdsbmEFhHMQQLc1lPRBCZhFBFicuKR0kLK6aNsUk4aM72NJygniBc2ULaDY/ANqmRtxvCaSu5K5jdKy7o778rt49RV0iDnMA2B2f2VxGWuwShbh5mhbDJDAS2J+Umzi3cX6kZt5G8rdtBsRs5tXJFLjmDUdfJEC1j5Wd0Gne241IPEHRXqIIrMPpI6AYeymibSCPkuRa0BgZa2W3NbSyyo6GloKKKhpYGQ0sLBHHE0Wa1oFgAOaykIgjYfh9LhVFDQ0NPHT00DQyOKMWaxo4AcyoKX7mWxlDiDMRptmsMirGSmZs7IQHteTfNfnvc3XUIggYvguG7QUL6HFaGnrqV/fRTsD2npsePSoGAbC7M7LTPnwbBaOime3K6ZjLvLebMbm3RdXyIItTh1JWVFLU1FPFLNSPL4HubcxOLS0lvMbEj1rZU00FZTyU9TFHNDI0tfHI0Oa4HgQdCFuRBzWD/c42RwCtFfhmz+H0tUAWtlZHqwHeG370dAsrrEMMo8UiZFW00VQyOVkzGyC4a9pu1w6QQCFLRBGqsPpK18ElRTxSvp38pE57QTG61szeY2JXkuG0k1dBXyU8bqqnY6OKYtu5jXWzAHhfKPkUpEFXj2zODbUUraTGsMpa+FrszWzsDsh52neD0ha8A2RwHZeORmC4TSUPKG73RMs55/tOOp9ZVwiCHR4VQ4fUVVRSUsUM1ZIJah7G2MrgAAXHibAD1L2DDaOmramuhpo46qryieVrbOlyizcx42BNlLRAK52g+59snhmKHFaLZ7DYK9znPNQyBokzON3G/Akn6V0SIIcmFUM2IQYlJSxvrKdjo4Zi27o2utmDTwvYX8y9qMLoqurpayopopKijc51PI5ozRFwyuLTwuNFLRBRYnsTs3jOKQ4tiOC0VVXwFpZPJGC4ZTdt+ex1F72VjW4VQ4lJSyVlLFO+klE8Be2/JvAIDhzGxPyqYiCHiGF0WKsjjrqWKobFK2ZgkbfLI03a4cxB1BUwIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIg//Z	Planta teste.jpg	image/jpeg	[{"id":"1","name":"Entrada","color":"#1E9BD7","x":39,"y":52,"width":33,"height":92},{"id":"2","name":"Ãrea Verde","color":"#22C55E","x":72,"y":58,"width":115,"height":94},{"id":"3","name":"Ãrea Azul","color":"#1E9BD7","x":72,"y":155,"width":70,"height":116},{"id":"4","name":"Corredor","color":"#F59E0B","x":138,"y":249,"width":52,"height":20},{"id":"1790795494128","name":"Ãrea central","color":"#1E9BD7","x":191,"y":166,"width":147,"height":99},{"id":"1790795532703","name":"Bar","color":"#0e4e0f","x":147,"y":163,"width":39,"height":79}]	Marta da Silva	2026-10-01 11:02:12.977911-03	2026-10-02 07:59:18.566298-03	1	1
c920334b-c141-47ea-a791-dd2c9828be58	\N	Ani Do Walle		2026-10-05	08:30:00	600	finished	1	0	2026-10-05 08:27:37.177748-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb	none	\N	data:image/jpeg;base64,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YjjuUpEEWrw+lrqGWhqqeKallYYnwvaC1zToWkbrWWqowTDqukgo6iihlpqdzHxRubdsbmEFhHMQQLc1lPRBCZhFBFicuKR0kLK6aNsUk4aM72NJygniBc2ULaDY/ANqmRtxvCaSu5K5jdKy7o778rt49RV0iDnMA2B2f2VxGWuwShbh5mhbDJDAS2J+Umzi3cX6kZt5G8rdtBsRs5tXJFLjmDUdfJEC1j5Wd0Gne241IPEHRXqIIrMPpI6AYeymibSCPkuRa0BgZa2W3NbSyyo6GloKKKhpYGQ0sLBHHE0Wa1oFgAOaykIgjYfh9LhVFDQ0NPHT00DQyOKMWaxo4AcyoKX7mWxlDiDMRptmsMirGSmZs7IQHteTfNfnvc3XUIggYvguG7QUL6HFaGnrqV/fRTsD2npsePSoGAbC7M7LTPnwbBaOime3K6ZjLvLebMbm3RdXyIItTh1JWVFLU1FPFLNSPL4HubcxOLS0lvMbEj1rZU00FZTyU9TFHNDI0tfHI0Oa4HgQdCFuRBzWD/c42RwCtFfhmz+H0tUAWtlZHqwHeG370dAsrrEMMo8UiZFW00VQyOVkzGyC4a9pu1w6QQCFLRBGqsPpK18ElRTxSvp38pE57QTG61szeY2JXkuG0k1dBXyU8bqqnY6OKYtu5jXWzAHhfKPkUpEFXj2zODbUUraTGsMpa+FrszWzsDsh52neD0ha8A2RwHZeORmC4TSUPKG73RMs55/tOOp9ZVwiCHR4VQ4fUVVRSUsUM1ZIJah7G2MrgAAXHibAD1L2DDaOmramuhpo46qryieVrbOlyizcx42BNlLRAK52g+59snhmKHFaLZ7DYK9znPNQyBokzON3G/Akn6V0SIIcmFUM2IQYlJSxvrKdjo4Zi27o2utmDTwvYX8y9qMLoqurpayopopKijc51PI5ozRFwyuLTwuNFLRBRYnsTs3jOKQ4tiOC0VVXwFpZPJGC4ZTdt+ex1F72VjW4VQ4lJSyVlLFO+klE8Be2/JvAIDhzGxPyqYiCHiGF0WKsjjrqWKobFK2ZgkbfLI03a4cxB1BUwIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIg//Z	Planta teste.jpg	image/jpeg	[{"id":"1","name":"Entrada","color":"#1E9BD7","x":30,"y":43,"width":40,"height":104},{"id":"2","name":"Cozinha","color":"#2421c4","x":221,"y":56,"width":85,"height":95},{"id":"3","name":"Ãrea1","color":"#04ff00","x":73,"y":54,"width":115,"height":93},{"id":"4","name":"Ãrea2","color":"#F59E0B","x":75,"y":147,"width":269,"height":122}]	Walisson	2026-10-05 08:30:07.081683-03	2026-10-05 18:30:18.659696-03	1	1
\.


--
-- Data for Name: eventoBrincadeira; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."eventoBrincadeira" ("eventoId", "brincadeiraId", ordem, "multiplicadorPontos", "criadoEm") FROM stdin;
\.


--
-- Data for Name: leitura; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leitura ("leituraId", "checkpointId", "criancaId", uid, "brincadeiraId", autorizado, "pontosAtribuidos", "forcaSinal", "criadoEm", "empresaId", session_id) FROM stdin;
\.


--
-- Data for Name: log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.log ("logId", tipo, "clienteId", "eventoId", mensagem, detalhes, "criadoEm", "empresaId") FROM stdin;
\.


--
-- Data for Name: logins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.logins ("loginId", "empresaId", email, senha, status, "ultimoAcesso", "dataCriacao", data_atualizacao, perfil, "nomeFamilia") FROM stdin;
5694317f-0465-4d07-a99c-2bb0e0a3073c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	display@buffetadv.com	MTIzNDU2	active	2026-10-05 11:29:41.017007-03	2026-10-05 11:29:22.146688-03	2026-10-05 11:29:22.146688-03	display	\N
b5782399-a62a-44f1-9c72-eac13038799c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	familia@gmail.com	MTIzNDU2	inactive	2026-07-28 10:28:51.388423-03	2026-07-28 10:28:39.650261-03	2026-08-17 14:35:17.580619-03	family	\N
b4e1423e-c1b2-4889-8492-3712d383e382	c9287e4b-399d-4764-8bff-2e0ce7058dcb	alissonbr158@gmail.com	VHJvcGExNDdA	inactive	2026-07-28 13:55:51.351766-03	2026-07-28 13:53:33.17828-03	2026-08-17 14:35:20.873516-03	family	Walisson
933bede9-f92a-47bc-b097-53f5c2284d96	c9287e4b-399d-4764-8bff-2e0ce7058dcb	mikael@gmail.com	MTIzNDU2	inactive	2026-07-28 14:00:03.148601-03	2026-07-28 13:59:29.165436-03	2026-08-17 14:35:23.021981-03	family	Mikaek
b9761ed2-a9d8-4544-a636-acb135fb2df2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	telao@gmail.com	MTIzNDU2	inactive	2026-10-05 09:45:02.781346-03	2026-07-16 10:36:12.93-03	2026-10-05 11:30:00.012109-03	display	\N
554533a9-a324-42ee-8b30-21818c666ed7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	mikael.freitas@advantag.com.br	dGVzdGUxMjM=	active	2026-09-29 10:21:44.822604-03	2026-09-29 10:18:52.481887-03	2026-09-29 10:19:16.701087-03	family	Mikael
86fc3d17-3592-4c10-adb5-7e92a8ed0c21	c9287e4b-399d-4764-8bff-2e0ce7058dcb	dalton@abgc.com.br	MTIzNDU2	active	2026-10-03 18:38:32.248508-03	2026-09-01 11:50:26.214716-03	2026-10-02 16:57:12.7912-03	family	Dalton
eb308270-a0ea-46d5-a252-ad4847957d92	c9287e4b-399d-4764-8bff-2e0ce7058dcb	alissoneu9@gmail.com	MTIzNDU2	active	2026-10-03 18:38:55.96965-03	2026-10-02 12:19:49.420981-03	2026-10-02 16:58:13.486644-03	family	Walisson
313ba6f8-cfb2-43ad-9da8-f93c9500ccf0	01afb92b-5ad2-4823-8341-d9f821d210db	walisson@gmail.com	MTIzNDU2	active	\N	2026-09-22 10:38:52.087708-03	2026-09-22 10:38:52.087708-03	family	walisson
cf62d6f3-ddfe-4985-a9e8-5f733abe0bfd	c9287e4b-399d-4764-8bff-2e0ce7058dcb	rodrigo@teste.com	MTIzNDU2	inactive	\N	2026-09-25 15:36:52.050145-03	2026-09-29 16:55:40.278701-03	family	Rodrigo
f382c9d4-9c90-4369-baac-8feb8b5316c3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	recpcao@gmail.com	MTIzNDU2	active	2026-10-05 08:26:00.562611-03	2026-07-16 07:27:26.647-03	2026-07-16 07:27:26.647-03	reception	\N
b86f2f81-c54c-4618-a3eb-913c35fbc099	c9287e4b-399d-4764-8bff-2e0ce7058dcb	walisson.almeida@advantag.com.br	MTIzNDU2	active	\N	2026-09-22 14:19:08.76361-03	2026-09-22 14:23:52.001812-03	family	walisson
218e9825-52fe-410d-9f0b-830bba985938	c9287e4b-399d-4764-8bff-2e0ce7058dcb	testetes@gmail.com	MTIzNDU2	active	\N	2026-09-22 14:32:29.752411-03	2026-09-22 15:45:58.356846-03	family	teste
cfa31060-233f-4ef8-9e82-635f4ad92fb4	c9287e4b-399d-4764-8bff-2e0ce7058dcb	recreacionista@gmail.com	MTIzNDU2	active	2026-10-05 09:43:10.634079-03	2026-07-16 08:30:47.673-03	2026-07-16 08:30:47.673-03	game_master	\N
c7234ca6-a5c5-403a-9528-45d964859785	c9287e4b-399d-4764-8bff-2e0ce7058dcb	testetest@gmail.com	MTIzNDU2	active	\N	2026-09-22 14:35:15.213905-03	2026-09-22 15:46:02.240964-03	family	testess
4ddf6bfd-072a-4bbe-b76a-d1681b0d2d13	c9287e4b-399d-4764-8bff-2e0ce7058dcb	guilherme1@gmail.com	MTIzNDU2	active	2026-09-22 15:46:27.316555-03	2026-09-22 15:45:39.536491-03	2026-09-22 15:45:59.835653-03	family	gui
d88ce8f9-5e2a-4419-8d2a-d960135538a0	c9287e4b-399d-4764-8bff-2e0ce7058dcb	daltonkm@yahoo.com.br	MTIzNDU2	active	2026-09-29 17:07:59.135837-03	2026-09-29 17:07:22.509365-03	2026-09-29 17:18:37.292153-03	family	Dalton Miyazato
3a4410d1-9071-417f-a3f1-1a9c12f7b23f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	atendimento@gmail.com	MTIzNDU2	active	2026-10-05 10:13:35.253706-03	2026-08-18 10:10:22.252465-03	2026-08-18 10:10:22.252465-03	kiosk	\N
0f1a7f02-9427-472f-86b9-0e56a84bbb35	c9287e4b-399d-4764-8bff-2e0ce7058dcb	testetessst@gmail.com	MTIzNDU2	active	\N	2026-09-29 17:20:12.660603-03	2026-09-29 17:20:12.660603-03	family	Walisson Almeida
83c8893e-32d6-4e8e-a1c0-78be3943175b	61bc768f-c5c0-45c3-9696-f551c4b6ebce	master@pulyn.com.br	bWFzdGVyMTIzNDU2	active	2026-10-05 14:24:51.991971-03	2026-07-15 12:19:36.35-03	2026-07-15 12:19:36.35-03	master	\N
a54ed528-2662-4935-ac83-e5973f5b295b	c9287e4b-399d-4764-8bff-2e0ce7058dcb	teste@gmail.com	MTIzNDU2	active	2026-10-05 15:22:12.743443-03	2026-07-15 12:31:54.11-03	2026-07-15 12:31:54.11-03	admin	\N
dc807d1f-448c-4d16-8207-328f2acff028	c9287e4b-399d-4764-8bff-2e0ce7058dcb	pontuacao@gmail.com	MTIzNDU2	active	2026-10-06 09:31:47.516234-03	2026-08-19 11:10:56.683112-03	2026-08-19 11:10:56.683112-03	score_kiosk	\N
\.


--
-- Data for Name: mensagemDisplay; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."mensagemDisplay" ("mensagemId", "eventoId", texto, tipo, remetente, "enviadoEm") FROM stdin;
95388ba6-2bd1-4423-9d22-6906fb8d64e7	c920334b-c141-47ea-a791-dd2c9828be58	Preparem-se!	preset	recreacionista@gmail.com	2026-10-05 09:44:42.022478-03
1a30d858-0d60-4781-b143-f414a0b6ffb6	c920334b-c141-47ea-a791-dd2c9828be58	Faltam 5 minutos!	preset	recreacionista@gmail.com	2026-10-05 09:45:11.22874-03
81616d71-4ee8-4653-b29b-5a75a6903ec4	c920334b-c141-47ea-a791-dd2c9828be58	AtenÃ§Ã£o ao prÃ³ximo desafio!	preset	recreacionista@gmail.com	2026-10-05 09:45:12.931769-03
dfa29740-b214-4d65-bbb3-dfdca5b60d40	c920334b-c141-47ea-a791-dd2c9828be58	ParabÃ©ns a todos!	preset	recreacionista@gmail.com	2026-10-05 09:45:14.334857-03
eb67b356-8581-4fd6-bbfe-3b6466690307	c920334b-c141-47ea-a791-dd2c9828be58	Equipe vencedora!	preset	recreacionista@gmail.com	2026-10-05 09:45:15.971374-03
f421e834-42d3-4b52-aec7-a723f616a276	c920334b-c141-47ea-a791-dd2c9828be58	Jogo iniciado!	preset	recreacionista@gmail.com	2026-10-05 09:45:19.274331-03
\.


--
-- Data for Name: monsterCacaLeitura; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."monsterCacaLeitura" (id, partida_id, empresa_id, evento_id, brincadeira_id, checkpoint_id, crianca_id, time_id, uid, leitura_id, attack_type, damage, monster_hp_after, monster_defeated, version, scanned_at) FROM stdin;
\.


--
-- Data for Name: monsterCacaPartida; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."monsterCacaPartida" (id, empresa_id, evento_id, brincadeira_id, status, hp, max_hp, normal_damage, special_checkpoint_damage, special_attack_damage, special_checkpoint_id, winner_time_id, version, started_at, finished_at, created_at) FROM stdin;
0aaad036-b722-4d21-9dc5-065b88776907	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-08-28 15:45:56.127-03	2026-08-28 15:46:35.892644-03	2026-08-28 15:45:56.129614-03
762c47fe-91ae-4216-b76f-585f32f37e00	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	10	\N	1	2026-10-01 11:16:11.708-03	2026-10-01 11:17:12.917402-03	2026-10-01 11:16:11.709039-03
3c7a43a9-0b03-4dd9-a487-1fdc1ea1cfb8	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	12	\N	1	2026-10-01 11:37:00.332-03	2026-10-01 11:51:59.495323-03	2026-10-01 11:37:00.329459-03
ea09b376-d26e-48d4-9dae-cfad4a4240ff	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	12	\N	1	2026-10-01 14:43:52.04-03	2026-10-01 14:44:01.538009-03	2026-10-01 14:43:52.035633-03
ea5ac4e8-5530-4338-a13d-c7f26a945a97	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-02 10:34:04.208-03	2026-09-02 10:34:59.474313-03	2026-09-02 10:34:06.299836-03
9f45953a-de69-42ff-a9e5-42351ca68622	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	5	\N	1	2026-09-10 13:10:23.031-03	2026-09-10 13:11:29.990784-03	2026-09-10 13:10:23.0304-03
88fe7cc6-1d95-4f0e-9c75-a6873a74ffe0	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	10	\N	1	2026-10-01 14:44:59.324-03	2026-10-01 14:46:12.411224-03	2026-10-01 14:44:59.319494-03
f378e3a8-672e-4c6c-8edb-1839842c7c38	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	15	\N	3	2026-08-31 11:32:54.059-03	2026-09-15 16:52:15.090291-03	2026-08-31 11:32:54.061883-03
e8d02467-8852-4637-9c12-22e0d27d84f7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	3	\N	1	2026-09-15 16:54:42.704-03	2026-09-15 16:55:50.143879-03	2026-09-15 16:54:42.615553-03
d761a519-762d-42ef-abb2-8303e7611721	c9287e4b-399d-4764-8bff-2e0ce7058dcb	909bb418-82c5-4461-869e-72bc9bfbb3aa	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	11	\N	1	2026-10-02 16:33:18.118-03	2026-10-02 16:39:58.701436-03	2026-10-02 16:33:18.116375-03
6c693efc-88a2-42d8-a525-8f1320aa4cad	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	15	\N	3	2026-08-31 09:46:12.008-03	2026-09-16 15:24:54.307374-03	2026-08-31 09:46:12.005178-03
0bca2a54-fe8c-4646-9a14-09f89ff7c706	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-18 09:56:07.507-03	2026-09-18 09:56:36.738063-03	2026-09-18 09:56:06.160419-03
85e55d30-09f4-4781-969d-e0a07ef0eefd	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-18 16:33:14.025-03	2026-09-18 16:33:32.224565-03	2026-09-18 16:33:12.540406-03
8f064fc7-f48c-4c50-8603-adb1d486efe2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	15	\N	1	2026-09-21 08:44:28.289-03	2026-09-21 08:44:38.0829-03	2026-09-21 08:44:30.318791-03
e906a9e8-02b0-4c65-91e1-bf22c9e20708	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	3	\N	1	2026-09-23 17:45:40.796-03	2026-09-23 17:45:42.077229-03	2026-09-23 17:45:40.796789-03
fc51d236-3a7a-4ab3-8d63-843dc9512375	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	3	\N	1	2026-09-25 10:27:43.098-03	2026-09-25 10:27:53.512979-03	2026-09-25 10:27:43.098048-03
0fa1d523-434f-451f-859e-854272237906	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-25 10:54:58.729-03	2026-09-25 10:56:09.846099-03	2026-09-25 10:54:58.729918-03
b44395d9-d350-4930-a6e0-2d53fc8d5c0d	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	5	\N	1	2026-09-25 11:46:59.637-03	2026-09-25 11:53:09.11861-03	2026-09-25 11:46:59.636528-03
2044c05a-43c6-46e8-a87d-bc8c664e5dc1	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-25 11:57:28.792-03	2026-09-25 12:04:52.38239-03	2026-09-25 11:57:28.791069-03
3ddc7f55-7192-4fe0-8c6a-17e952dd74f5	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	15	\N	1	2026-09-25 13:54:28.979-03	2026-09-25 13:56:15.735968-03	2026-09-25 13:54:28.983435-03
7ed1ac78-98b5-4e6f-9be7-8104472609f3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-28 12:19:51.849-03	2026-09-28 12:21:36.302134-03	2026-09-28 12:19:51.849355-03
d652c4a1-a12c-4f10-9ffa-95ddec7021a5	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	3	\N	1	2026-09-29 09:00:39.324-03	2026-09-29 09:00:43.158583-03	2026-09-29 09:00:39.320283-03
8378a269-12a0-406f-b8eb-cf64f112ab64	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	5	\N	1	2026-09-29 15:03:23.259-03	2026-09-29 15:04:05.746799-03	2026-09-29 15:03:22.80071-03
66774e52-2171-40db-9844-38f1bef74be6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	5	\N	1	2026-09-29 16:26:20.649-03	2026-09-29 16:26:40.586796-03	2026-09-29 16:26:20.650426-03
monster-9ba04dda	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	100	100	10	25	50	15	\N	1	2026-08-28 15:26:55.328-03	2026-08-28 15:42:46.850503-03	2026-08-28 15:26:55.328-03
823aaa81-44ed-4d72-aec2-d1cc02846e32	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	15	\N	1	2026-08-28 16:41:39.792-03	2026-08-28 17:35:52.040187-03	2026-08-28 16:41:39.790921-03
cf639bb1-02f1-4d18-82d9-c3e434d9767e	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	12	\N	1	2026-10-01 11:19:43.341-03	2026-10-01 11:36:35.014687-03	2026-10-01 11:19:43.342437-03
a0409ce1-d7ef-4a15-8524-fc69afa9f8fb	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	3	\N	1	2026-08-31 11:31:50.833-03	2026-08-31 11:31:55.129902-03	2026-08-31 11:31:50.83522-03
654724c2-cb0c-46ef-9184-acb72a944c07	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	5	\N	1	2026-09-02 10:31:45.254-03	2026-09-02 10:33:43.100626-03	2026-09-02 10:31:47.325381-03
683a60b3-7ff5-4463-be95-5c09a37e5827	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	13	\N	1	2026-10-01 15:04:08.045-03	2026-10-01 15:05:49.696039-03	2026-10-01 15:04:08.041277-03
a7a47887-cc60-4413-8dad-4447e9d3b218	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	3	\N	1	2026-09-02 10:52:28.804-03	2026-09-02 10:52:44.756818-03	2026-09-02 10:52:30.932263-03
3249dcfd-1e4d-4a09-8f21-d6d43bf67f4a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-15 08:45:08.066-03	2026-09-15 12:04:54.790192-03	2026-09-15 08:45:08.115872-03
c3953c8b-af1e-4cc7-a454-e097bfa265c0	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-16 11:16:35.056-03	2026-09-16 11:16:50.02807-03	2026-09-16 11:16:34.615128-03
65767144-09e9-4d6e-b8a7-54a65c161196	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-18 13:41:19.372-03	2026-09-18 13:41:32.77681-03	2026-09-18 13:41:19.374129-03
48b2b330-2d83-421f-be96-16840a579e44	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	5	\N	1	2026-09-18 16:47:44.654-03	2026-09-18 16:47:49.468628-03	2026-09-18 16:47:44.652983-03
3e35ec5a-b7e5-4997-a731-b06cccceaf7c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-21 11:34:19.819-03	2026-09-21 11:35:23.776436-03	2026-09-21 11:34:21.775979-03
4f7afe70-74c4-4594-97c4-2dca10d91099	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	5	\N	1	2026-09-25 08:23:14.012-03	2026-09-25 08:27:06.521554-03	2026-09-25 08:23:14.009633-03
f522af1e-41a8-4110-abab-eea23e991e0a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-25 10:53:39.626-03	2026-09-25 10:53:48.355626-03	2026-09-25 10:53:39.626511-03
da22c0b3-7641-4709-8135-01b2daa81c86	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	3	\N	1	2026-09-25 11:42:25.794-03	2026-09-25 11:43:40.992906-03	2026-09-25 11:42:25.794392-03
69ac454b-a080-4439-8cd6-cbe6f82862b6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	15	\N	1	2026-09-25 11:53:25.749-03	2026-09-25 11:56:36.399258-03	2026-09-25 11:53:25.750293-03
455a3340-393c-4c7d-b35f-d4a6250b6973	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	15	\N	1	2026-09-25 13:40:53.718-03	2026-09-25 13:54:25.795367-03	2026-09-25 13:40:53.722079-03
800551cf-84ca-4d2d-a4ef-89720d7761df	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	5	\N	1	2026-09-25 15:47:13.265-03	2026-09-25 15:47:43.428847-03	2026-09-25 15:47:13.261387-03
088042a6-b718-4f2d-86a0-c84ab80bfff7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	9	\N	1	2026-09-28 16:06:19.374-03	2026-09-28 16:34:30.328654-03	2026-09-28 16:06:19.377225-03
1db7a8c2-305d-4fc8-906a-372ad89409d8	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	3	\N	1	2026-09-28 17:13:37.384-03	2026-09-28 17:41:45.67115-03	2026-09-28 17:13:37.381175-03
b9d2e850-da9d-4802-bf02-29b98e3a7465	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	15	\N	1	2026-09-29 09:01:00.337-03	2026-09-29 09:02:37.587098-03	2026-09-29 09:01:00.333325-03
8c9b59c0-9b0f-446c-8ff4-aeace36a40fb	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	finished	500	500	10	30	50	3	\N	1	2026-09-29 15:04:12.912-03	2026-09-29 15:05:06.729331-03	2026-09-29 15:04:12.914611-03
\.


--
-- Data for Name: pontoVerificacao; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."pontoVerificacao" ("checkpointId", "eventoId", nome, tipo, ip, zona, "corLed", points, status, "territorioDonoTimeId", "territorioTravadoAte", "territorioCooldownAte", "ultimoConquistadoEm", "criadoEm", "empresaId", "tagsAutorizadas", "ultimoVisto", location, proposito, "mapaX", "mapaY", "territorioDonosCriancaId") FROM stdin;
\.


--
-- Data for Name: pontuacao; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pontuacao ("pontuacaoId", "eventoId", "criancaId", "brincadeiraId", "checkpointId", pontos, "leituraId", "criadoEm", "empresaId") FROM stdin;
\.


--
-- Data for Name: pulseira; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pulseira (codigo, status, crianca_id, created_at, empresa_id) FROM stdin;
\.


--
-- Data for Name: sessoesJogo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."sessoesJogo" (id, evento_id, brincadeira_id, game_type, mode, status, started_at, finished_at, created_at, updated_at) FROM stdin;
db13e098-562a-4db6-8260-d7c32e2b91b7	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	treasure_hunt	\N	finished	2026-09-25 15:52:31.731377-03	2026-09-25 15:54:35.256428-03	2026-09-25 15:52:31.731377-03	2026-09-25 15:52:31.731377-03
9a5f5f02-f60b-4cec-87d6-51037b6cce8c	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:38:42.973907-03	2026-09-22 11:39:11.555053-03	2026-09-22 11:38:42.973907-03	2026-09-22 11:38:42.973907-03
6fba31b1-56f5-48de-ac6c-4436ea2d35b6	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:42:19.720106-03	2026-09-22 11:43:52.681875-03	2026-09-22 11:42:19.720106-03	2026-09-22 11:42:19.720106-03
6602f6ad-1010-4732-8653-79331b1b095d	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 15:54:35.260281-03	2026-09-25 15:54:37.887982-03	2026-09-25 15:54:35.260281-03	2026-09-25 15:54:35.260281-03
3fc0b2f3-e045-4e19-b829-737f87f788ea	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:46:12.737324-03	2026-09-22 11:46:48.733301-03	2026-09-22 11:46:12.737324-03	2026-09-22 11:46:12.737324-03
726eaadb-8487-4a17-838b-597c2556f68b	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:51:26.119203-03	2026-09-22 11:53:45.047867-03	2026-09-22 11:51:26.119203-03	2026-09-22 11:51:26.119203-03
fa999f24-0059-4a7c-9c28-bd71359aff80	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-09-28 16:06:19.441907-03	2026-09-28 16:34:30.342942-03	2026-09-28 16:06:19.441907-03	2026-09-28 16:06:19.441907-03
44ae8953-6d44-43d8-88d0-4b09e1dceadd	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	\N	finished	2026-09-22 12:08:41.067607-03	2026-09-22 12:08:58.006175-03	2026-09-22 12:08:41.067607-03	2026-09-22 12:08:41.067607-03
ea22333b-51b6-4358-a4b1-15f98a080fdc	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 13:33:56.069369-03	2026-09-22 13:34:26.024181-03	2026-09-22 13:33:56.069369-03	2026-09-22 13:33:56.069369-03
c68931b0-32e2-4f9c-9c39-b7e0c16de492	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-09-28 17:13:37.43892-03	2026-09-28 17:41:45.68005-03	2026-09-28 17:13:37.43892-03	2026-09-28 17:13:37.43892-03
fa79ca45-da68-40a2-b309-918df3375381	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 13:47:46.989701-03	2026-09-22 13:47:56.225418-03	2026-09-22 13:47:46.989701-03	2026-09-22 13:47:46.989701-03
5968aabd-516f-40bc-9189-b768c0a6eae5	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 13:49:43.038087-03	2026-09-22 13:50:10.868433-03	2026-09-22 13:49:43.038087-03	2026-09-22 13:49:43.038087-03
c540f970-42b3-4f13-83ea-2a3f6e85de4d	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-09-29 15:03:24.884417-03	2026-09-29 15:04:05.77044-03	2026-09-29 15:03:24.884417-03	2026-09-29 15:03:24.884417-03
50c05d1d-343d-4f12-9537-7a670ff29e09	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 08:21:20.397536-03	2026-09-25 08:22:08.35954-03	2026-09-25 08:21:20.397536-03	2026-09-25 08:21:20.397536-03
9218e6ca-fd08-43f0-8478-f208ec024cf8	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 08:29:12.763243-03	2026-09-25 08:30:27.427297-03	2026-09-25 08:29:12.763243-03	2026-09-25 08:29:12.763243-03
503b2e09-2c1f-461a-ac23-95149d5e11ef	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	treasure_hunt	\N	finished	2026-09-29 16:26:44.478814-03	2026-09-29 16:26:51.879712-03	2026-09-29 16:26:44.478814-03	2026-09-29 16:26:44.478814-03
ec52880a-d506-47f5-bb3c-1264ef544ba7	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 08:45:07.875296-03	2026-09-25 08:45:43.65013-03	2026-09-25 08:45:07.875296-03	2026-09-25 08:45:07.875296-03
61babd08-6e6b-41e5-be72-4d392da1179d	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 10:14:13.010755-03	2026-09-25 10:14:27.305099-03	2026-09-25 10:14:13.010755-03	2026-09-25 10:14:13.010755-03
930d576d-4914-4393-879f-bf7ab20c0e3d	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-10-01 08:22:01.710541-03	2026-10-01 08:22:28.300477-03	2026-10-01 08:22:01.710541-03	2026-10-01 08:22:01.710541-03
8a6d25a7-65ec-447a-8072-cbed3b290b16	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	treasure_hunt	team	finished	2026-09-25 10:27:59.653306-03	2026-09-25 10:28:19.333943-03	2026-09-25 10:27:59.653306-03	2026-09-25 10:27:59.653306-03
f95d1825-f565-4208-af09-f86405cfeafa	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 11:06:34.894933-03	2026-09-25 11:07:22.928147-03	2026-09-25 11:06:34.894933-03	2026-09-25 11:06:34.894933-03
e3e606c6-9d24-4409-8e7f-e5b12e50dae4	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-10-01 10:18:38.09242-03	2026-10-01 10:18:43.456008-03	2026-10-01 10:18:38.09242-03	2026-10-01 10:18:38.09242-03
37a56cec-6e35-445e-9e45-4022b5a7d2e5	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	\N	finished	2026-09-25 13:56:22.464159-03	2026-09-25 13:57:09.719848-03	2026-09-25 13:56:22.464159-03	2026-09-25 13:56:22.464159-03
4ec340ae-2a47-470b-bb66-e4631371cff8	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-10-01 11:12:04.59118-03	2026-10-01 11:12:12.093853-03	2026-10-01 11:12:04.59118-03	2026-10-01 11:12:04.59118-03
b96efde2-867c-45bc-85e9-63743c6d8786	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 14:22:39.10074-03	2026-09-25 14:23:00.188042-03	2026-09-25 14:22:39.10074-03	2026-09-25 14:22:39.10074-03
d82c31a2-f272-472e-a100-f551262b560e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 11:28:01.668568-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:28:01.668568-03	2026-09-21 11:28:01.668568-03
826dedf2-5e7b-4d94-a700-e54986bdc16e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	\N	finished	2026-09-21 11:31:54.801538-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:31:54.801538-03	2026-09-21 11:31:54.801538-03
d24a6880-397f-4cfb-8027-81f03da6155c	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 11:33:20.236801-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:33:20.236801-03	2026-09-21 11:33:20.236801-03
765c4198-7b7f-47cd-9436-a74690184be3	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-09-21 11:34:23.212333-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:34:23.212333-03	2026-09-21 11:34:23.212333-03
4aee95e3-ae59-40d6-b208-045aec03b0d5	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	treasure_hunt	\N	finished	2026-09-21 11:35:37.576209-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:35:37.576209-03	2026-09-21 11:35:37.576209-03
0cd57505-fbcf-42a2-a346-0c84ea1eea1c	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 11:36:34.218006-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:36:34.218006-03	2026-09-21 11:36:34.218006-03
5b8567f7-bcb6-4df3-9926-47d4dfbb4af1	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 11:38:25.229522-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:38:25.229522-03	2026-09-21 11:38:25.229522-03
d5bba0ee-2c4f-4167-bd4c-55be509bc3c8	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 11:42:20.128172-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:42:20.128172-03	2026-09-21 11:42:20.128172-03
d8afda94-d322-413e-b25d-9018653dc445	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 14:23:14.592561-03	2026-09-25 14:23:53.718596-03	2026-09-25 14:23:14.592561-03	2026-09-25 14:23:14.592561-03
92306001-c730-4520-8950-a62bb69fa8bf	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 14:37:32.36062-03	2026-09-25 14:38:32.609491-03	2026-09-25 14:37:32.36062-03	2026-09-25 14:37:32.36062-03
8f3ab98e-2e10-4314-9eaf-c4f4ac0133ab	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 14:43:28.610051-03	2026-09-25 14:43:51.063431-03	2026-09-25 14:43:28.610051-03	2026-09-25 14:43:28.610051-03
62ad89e5-0ec0-47e7-8d69-39d2feb6659b	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 14:50:56.386431-03	2026-09-25 14:51:26.465283-03	2026-09-25 14:50:56.386431-03	2026-09-25 14:50:56.386431-03
952a6860-79a0-40d7-bdcc-f1a7d1dee9a5	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 15:03:47.729243-03	2026-09-25 15:04:09.657939-03	2026-09-25 15:03:47.729243-03	2026-09-25 15:03:47.729243-03
42b4ece8-5829-40d3-90a2-134675bd8119	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 15:17:17.44541-03	2026-09-25 15:19:30.525537-03	2026-09-25 15:17:17.44541-03	2026-09-25 15:17:17.44541-03
d63793b4-54f9-462e-b868-0042ed3279bc	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 11:44:45.262233-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:44:45.262233-03	2026-09-21 11:44:45.262233-03
f644c7e8-ab04-4131-a6ab-749fbf8bfcd9	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 11:46:32.564131-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:46:32.564131-03	2026-09-21 11:46:32.564131-03
2eff904d-217c-4a7a-aa1b-fedf0d933f77	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 11:48:13.529298-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:48:13.529298-03	2026-09-21 11:48:13.529298-03
d6962e63-cee7-4078-9191-4be121e0786e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 11:53:56.846363-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:53:56.846363-03	2026-09-21 11:53:56.846363-03
e7bfe422-e016-4624-a664-08b58aad88d1	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 11:55:49.816997-03	2026-09-21 13:46:40.84317-03	2026-09-21 11:55:49.816997-03	2026-09-21 11:55:49.816997-03
6157e07e-545f-49e5-a00a-fe2f39c53c79	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 12:00:16.92737-03	2026-09-21 13:46:40.84317-03	2026-09-21 12:00:16.92737-03	2026-09-21 12:00:16.92737-03
281b7fa0-6314-421e-b156-552d68d28477	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 12:02:52.256536-03	2026-09-21 13:46:40.84317-03	2026-09-21 12:02:52.256536-03	2026-09-21 12:02:52.256536-03
80398158-455e-4d4b-8b0f-986e5f271382	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 12:04:53.399624-03	2026-09-21 13:46:40.84317-03	2026-09-21 12:04:53.399624-03	2026-09-21 12:04:53.399624-03
b4323e43-c885-43b8-b9bd-d16c9efc39be	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 12:05:40.481039-03	2026-09-21 13:46:40.84317-03	2026-09-21 12:05:40.481039-03	2026-09-21 12:05:40.481039-03
731f0aeb-529a-4334-87e4-1a2ffcbcb67b	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 12:09:32.3894-03	2026-09-21 13:46:40.84317-03	2026-09-21 12:09:32.3894-03	2026-09-21 12:09:32.3894-03
4d23f46e-871b-4c08-a1b6-83a9a60c6e4a	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 12:15:14.930178-03	2026-09-21 13:46:40.84317-03	2026-09-21 12:15:14.930178-03	2026-09-21 12:15:14.930178-03
ac934ebb-3268-4372-bf09-d06ae54da2ca	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 12:18:30.807729-03	2026-09-21 13:46:40.84317-03	2026-09-21 12:18:30.807729-03	2026-09-21 12:18:30.807729-03
c04a3552-bb7a-446f-a294-3e6d000a68fc	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 12:28:12.677419-03	2026-09-21 13:46:40.84317-03	2026-09-21 12:28:12.677419-03	2026-09-21 12:28:12.677419-03
d857de2d-916c-4979-a981-23dac9c58933	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:12:10.601181-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:12:10.601181-03	2026-09-21 13:12:10.601181-03
ddc4b799-1aed-451a-a7f8-87f3cccf0b26	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:13:38.591166-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:13:38.591166-03	2026-09-21 13:13:38.591166-03
3ea36dc5-d05c-4bdf-88ce-ec5349e0b89b	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:15:35.593494-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:15:35.593494-03	2026-09-21 13:15:35.593494-03
8f7aed7b-0d8f-48b7-a60d-19a2490ff0c2	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:16:44.903786-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:16:44.903786-03	2026-09-21 13:16:44.903786-03
b8a5302d-7f8d-45a5-8a1e-259e53153b17	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:18:26.403301-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:18:26.403301-03	2026-09-21 13:18:26.403301-03
7bfbb266-7828-4a49-93dc-7ed9fa7f4221	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:21:28.767472-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:21:28.767472-03	2026-09-21 13:21:28.767472-03
ff7b4a62-25f5-4673-8901-68f88144c5bd	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:24:36.50224-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:24:36.50224-03	2026-09-21 13:24:36.50224-03
fa2dd2c2-130d-4458-b45c-3da8f04ce8da	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:32:06.270153-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:32:06.270153-03	2026-09-21 13:32:06.270153-03
2e325b60-ff13-4a1c-9313-4aee27d1bd00	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:35:01.016469-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:35:01.016469-03	2026-09-21 13:35:01.016469-03
aabd05af-4717-40e9-b24d-75e09bc38186	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	treasure_hunt	\N	finished	2026-09-21 13:41:02.12755-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:41:02.12755-03	2026-09-21 13:41:02.12755-03
d0f3bfeb-df33-418c-91d5-bebf167a84bf	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:41:36.914711-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:41:36.914711-03	2026-09-21 13:41:36.914711-03
101d4c89-23f8-4a83-84a1-ea7428283ce3	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:45:51.891931-03	2026-09-21 13:46:40.84317-03	2026-09-21 13:45:51.891931-03	2026-09-21 13:45:51.891931-03
083761cc-055c-48db-91a2-44ab1af8aac3	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:46:58.419972-03	2026-09-21 13:47:34.651109-03	2026-09-21 13:46:58.419972-03	2026-09-21 13:46:58.419972-03
602bf273-9ae3-48e5-bbfe-7e19fb675911	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:50:19.123555-03	2026-09-21 13:50:42.614312-03	2026-09-21 13:50:19.123555-03	2026-09-21 13:50:19.123555-03
3ecc4b8a-53df-465e-8827-7077e658ad98	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:56:15.553285-03	2026-09-21 13:57:28.667839-03	2026-09-21 13:56:15.553285-03	2026-09-21 13:56:15.553285-03
84f4077c-1013-4a97-bc64-eb0dbf9ef87c	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 13:58:41.721606-03	2026-09-21 13:59:09.120967-03	2026-09-21 13:58:41.721606-03	2026-09-21 13:58:41.721606-03
6de137f6-d9fa-4d67-bf0b-dc671a6ffad9	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 14:03:46.649448-03	2026-09-21 14:04:12.521619-03	2026-09-21 14:03:46.649448-03	2026-09-21 14:03:46.649448-03
dab43835-6528-42c0-9321-d947ee217370	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 14:07:33.471261-03	2026-09-21 14:08:07.01535-03	2026-09-21 14:07:33.471261-03	2026-09-21 14:07:33.471261-03
c34effc1-1f39-473a-bf3f-13c12ebb0c31	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 14:36:47.405676-03	2026-09-21 14:37:07.215538-03	2026-09-21 14:36:47.405676-03	2026-09-21 14:36:47.405676-03
ee798032-39bd-4e45-95be-6e5547fba5f9	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 14:38:45.049691-03	2026-09-21 14:39:16.961052-03	2026-09-21 14:38:45.049691-03	2026-09-21 14:38:45.049691-03
09d8ff59-ad90-45b3-82ae-ba17a9350c83	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 14:41:37.835138-03	2026-09-21 14:42:11.281651-03	2026-09-21 14:41:37.835138-03	2026-09-21 14:41:37.835138-03
0f8ad240-e9b0-4e99-b7fb-7a4b63cb2966	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 14:43:48.697855-03	2026-09-21 14:45:02.015551-03	2026-09-21 14:43:48.697855-03	2026-09-21 14:43:48.697855-03
02a8bf37-832e-4305-a01f-47ab1444ff6e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 14:45:12.367641-03	2026-09-21 14:46:26.182931-03	2026-09-21 14:45:12.367641-03	2026-09-21 14:45:12.367641-03
53c4010f-9858-4941-b131-83e4f7d146f1	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 14:46:34.471876-03	2026-09-21 14:47:35.318392-03	2026-09-21 14:46:34.471876-03	2026-09-21 14:46:34.471876-03
07350844-a3a6-4707-a108-abb6eb664260	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 14:54:31.618525-03	2026-09-21 15:01:32.0628-03	2026-09-21 14:54:31.618525-03	2026-09-21 14:54:31.618525-03
a2814ca6-1f50-41b1-ba89-ed8fc8c77dca	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:39:13.968234-03	2026-09-22 11:39:27.659766-03	2026-09-22 11:39:13.968234-03	2026-09-22 11:39:13.968234-03
6394d1c6-3ac0-4096-a606-1642917c1b90	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 15:01:40.45307-03	2026-09-21 15:03:51.456641-03	2026-09-21 15:01:40.45307-03	2026-09-21 15:01:40.45307-03
c8803289-b09d-4cf3-bd4e-314a660966f7	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 15:54:40.717198-03	2026-09-25 15:55:52.196679-03	2026-09-25 15:54:40.717198-03	2026-09-25 15:54:40.717198-03
7fdf3f64-8a5a-49ff-9ad1-2bb4bd00d92e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 15:11:03.405872-03	2026-09-21 15:11:40.558085-03	2026-09-21 15:11:03.405872-03	2026-09-21 15:11:03.405872-03
2e1ccbff-d1e9-4e7b-b415-0e2ac95cb344	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:43:56.687524-03	2026-09-22 11:44:09.344381-03	2026-09-22 11:43:56.687524-03	2026-09-22 11:43:56.687524-03
9fc3740d-3741-4aba-9c65-d4dbfaf9c332	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 15:11:50.938325-03	2026-09-21 15:13:51.400311-03	2026-09-21 15:11:50.938325-03	2026-09-21 15:11:50.938325-03
786c08ad-896d-4db1-a0e6-0aab415c0d5d	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-09-29 09:00:39.375969-03	2026-09-29 09:00:43.178934-03	2026-09-29 09:00:39.375969-03	2026-09-29 09:00:39.375969-03
0a81cbe7-9018-4918-b070-9198ccdf7915	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 15:31:55.547922-03	2026-09-22 08:15:08.92582-03	2026-09-21 15:31:55.547922-03	2026-09-21 15:31:55.547922-03
6870f37e-6001-4705-9cde-f6516ab5f160	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:48:28.010654-03	2026-09-22 11:48:35.125531-03	2026-09-22 11:48:28.010654-03	2026-09-22 11:48:28.010654-03
0841ea6c-9b38-45b2-be39-2bd104833f88	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:59:54.785253-03	2026-09-22 11:59:59.508477-03	2026-09-22 11:59:54.785253-03	2026-09-22 11:59:54.785253-03
efeb753b-0dd2-42aa-920d-c2c27f75cd58	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-09-29 09:01:00.385818-03	2026-09-29 09:02:37.603207-03	2026-09-29 09:01:00.385818-03	2026-09-29 09:01:00.385818-03
b5519c5f-f1e1-4355-9706-d490bcb74f88	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 12:04:23.069227-03	2026-09-22 12:05:01.115563-03	2026-09-22 12:04:23.069227-03	2026-09-22 12:04:23.069227-03
2a2d50f6-bb63-4987-834e-693a0416a2ff	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-09-29 15:04:12.966952-03	2026-09-29 15:05:06.750652-03	2026-09-29 15:04:12.966952-03	2026-09-29 15:04:12.966952-03
f27e18d6-4708-46ba-9a73-cfbf75ba63d8	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 12:13:02.782186-03	2026-09-22 12:13:45.609618-03	2026-09-22 12:13:02.782186-03	2026-09-22 12:13:02.782186-03
708ac203-7c30-4600-8d8a-8b88a0e4e9c5	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-29 16:26:55.576471-03	2026-09-29 16:27:18.174625-03	2026-09-29 16:26:55.576471-03	2026-09-29 16:26:55.576471-03
214018bf-d172-4d3e-9e80-2a76902360fd	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 12:16:31.757782-03	2026-09-22 12:16:49.476771-03	2026-09-22 12:16:31.757782-03	2026-09-22 12:16:31.757782-03
0a79add0-37f3-4fb2-b6b4-1b41631caa02	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 13:36:28.310821-03	2026-09-22 13:36:47.015452-03	2026-09-22 13:36:28.310821-03	2026-09-22 13:36:28.310821-03
b713c3fc-d95a-4e4d-96b6-6fa6e7419a56	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-29 16:27:21.567604-03	2026-09-29 16:27:59.668536-03	2026-09-29 16:27:21.567604-03	2026-09-29 16:27:21.567604-03
665a7829-5e64-42d2-96b2-b8c18c465602	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 13:39:12.323371-03	2026-09-22 13:39:34.33667-03	2026-09-22 13:39:12.323371-03	2026-09-22 13:39:12.323371-03
e1e3ef11-4483-41af-bfa7-594adc6e8af0	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-10-01 08:59:28.701287-03	2026-10-01 08:59:42.653451-03	2026-10-01 08:59:28.701287-03	2026-10-01 08:59:28.701287-03
2b3ff628-551d-4c6b-b9eb-6ce9b36e2018	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 13:52:49.728997-03	2026-09-22 13:53:34.403324-03	2026-09-22 13:52:49.728997-03	2026-09-22 13:52:49.728997-03
49f26a46-085b-4fb1-a6f6-69e4a59f39be	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 08:27:20.413454-03	2026-09-25 08:27:41.807951-03	2026-09-25 08:27:20.413454-03	2026-09-25 08:27:20.413454-03
2ea0ecaf-2923-4c8d-8675-c561cb9e4249	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-10-01 10:49:52.161978-03	2026-10-01 10:49:56.011607-03	2026-10-01 10:49:52.161978-03	2026-10-01 10:49:52.161978-03
8d733c50-4fe1-4298-8562-79e16fc881bd	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 08:33:40.522232-03	2026-09-25 08:34:17.737969-03	2026-09-25 08:33:40.522232-03	2026-09-25 08:33:40.522232-03
8f85c154-068d-4355-aca3-c055e0f055c4	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 08:37:46.051004-03	2026-09-25 08:38:28.43207-03	2026-09-25 08:37:46.051004-03	2026-09-25 08:37:46.051004-03
a946608a-4c4b-44b3-a095-d781de00f3e6	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 08:49:04.667108-03	2026-09-25 08:49:43.567248-03	2026-09-25 08:49:04.667108-03	2026-09-25 08:49:04.667108-03
c39f69c1-54d1-42b8-b6c0-0d5d622ecb74	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 08:53:17.425212-03	2026-09-25 08:53:40.556445-03	2026-09-25 08:53:17.425212-03	2026-09-25 08:53:17.425212-03
649dccaf-a14b-4be3-99c5-e92e139ae50a	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 10:25:00.734614-03	2026-09-25 10:25:20.353156-03	2026-09-25 10:25:00.734614-03	2026-09-25 10:25:00.734614-03
d724bb48-9368-45bb-a216-42f9aecfdf6d	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 10:25:23.356636-03	2026-09-25 10:25:42.569365-03	2026-09-25 10:25:23.356636-03	2026-09-25 10:25:23.356636-03
e2a372b7-08cf-4ea9-88c5-54b238faa149	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 10:28:32.736818-03	2026-09-25 10:28:51.212139-03	2026-09-25 10:28:32.736818-03	2026-09-25 10:28:32.736818-03
d4a0a9dd-930a-439d-8fb2-288d00cca336	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 10:45:48.087847-03	2026-09-25 10:50:34.9564-03	2026-09-25 10:45:48.087847-03	2026-09-25 10:45:48.087847-03
31cbd062-6242-4bfd-8093-8731e1d4b515	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 11:07:27.958314-03	2026-09-25 11:07:48.680358-03	2026-09-25 11:07:27.958314-03	2026-09-25 11:07:27.958314-03
539b0a1f-d415-40ca-8f46-40fc32d1b348	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 14:18:38.712757-03	2026-09-25 14:18:44.480213-03	2026-09-25 14:18:38.712757-03	2026-09-25 14:18:38.712757-03
5874448b-a795-4702-aeda-fbc758ccd0f7	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 14:23:56.355151-03	2026-09-25 14:24:59.566119-03	2026-09-25 14:23:56.355151-03	2026-09-25 14:23:56.355151-03
18f0b629-c27f-4c9a-95e0-fbe5a3e75fe3	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 14:44:01.653412-03	2026-09-25 14:44:41.344529-03	2026-09-25 14:44:01.653412-03	2026-09-25 14:44:01.653412-03
6bef315f-3043-4391-895b-8afeecf6abdf	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 14:57:51.243163-03	2026-09-25 14:58:43.456465-03	2026-09-25 14:57:51.243163-03	2026-09-25 14:57:51.243163-03
8933482c-3d65-4a33-a1df-4414c19da0c2	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 15:08:04.63267-03	2026-09-25 15:08:27.66361-03	2026-09-25 15:08:04.63267-03	2026-09-25 15:08:04.63267-03
54600fda-81ee-4127-9215-fb473b74ca3f	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 15:39:49.05717-03	2026-09-25 15:40:31.624226-03	2026-09-25 15:39:49.05717-03	2026-09-25 15:39:49.05717-03
892e1b40-a63c-4abd-9260-66ecc070d271	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 15:48:37.490269-03	2026-09-25 15:52:10.015606-03	2026-09-25 15:48:37.490269-03	2026-09-25 15:48:37.490269-03
9c6c4cb7-ec50-4366-aaf5-ae871b9168b8	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 15:17:02.751076-03	2026-09-21 15:18:13.695981-03	2026-09-21 15:17:02.751076-03	2026-09-21 15:17:02.751076-03
0e67d067-6468-4173-a2f5-e53b4a044cfe	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-21 15:26:07.590621-03	2026-09-21 15:27:01.556258-03	2026-09-21 15:26:07.590621-03	2026-09-21 15:26:07.590621-03
88c7a69b-cd04-4854-b371-8d88ef034532	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	\N	finished	2026-09-22 11:39:30.778487-03	2026-09-22 11:40:14.59372-03	2026-09-22 11:39:30.778487-03	2026-09-22 11:39:30.778487-03
d1129e66-7792-4a3e-843d-8aa620b3a41b	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 08:14:18.815779-03	2026-09-22 08:15:08.92582-03	2026-09-22 08:14:18.815779-03	2026-09-22 08:14:18.815779-03
9c66c927-e5d4-4060-b389-1091e53c7bcf	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 16:21:50.590352-03	2026-09-25 16:22:06.683452-03	2026-09-25 16:21:50.590352-03	2026-09-25 16:21:50.590352-03
bac34379-6f00-474c-aa57-0fdfeaec5bcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 08:20:57.850903-03	2026-09-22 08:22:02.32401-03	2026-09-22 08:20:57.850903-03	2026-09-22 08:20:57.850903-03
28a9b8df-19a4-4058-981f-4ee1af2cb0a7	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:44:11.929429-03	2026-09-22 11:44:28.104942-03	2026-09-22 11:44:11.929429-03	2026-09-22 11:44:11.929429-03
1e554ab4-a8ab-4c58-a292-b7e4c49b2f37	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:29:51.273601-03	2026-09-22 11:30:46.215414-03	2026-09-22 11:29:51.273601-03	2026-09-22 11:29:51.273601-03
c4ab1b9e-1aab-45e0-8675-b285cc1d39ce	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:32:36.17324-03	2026-09-22 11:33:21.142525-03	2026-09-22 11:32:36.17324-03	2026-09-22 11:32:36.17324-03
04b1b7c7-b64a-4abd-9b3e-37921718ea1a	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:48:48.120952-03	2026-09-22 11:49:45.951186-03	2026-09-22 11:48:48.120952-03	2026-09-22 11:48:48.120952-03
f45b0864-f905-4a68-aab6-90952c9e1f37	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:36:01.180838-03	2026-09-22 11:36:29.634322-03	2026-09-22 11:36:01.180838-03	2026-09-22 11:36:01.180838-03
11c533d8-15d5-40df-aa26-1161af5e1c1b	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	b58b6207-7348-40fe-b7fc-432212d08534	treasure_hunt	\N	finished	2026-09-29 09:00:46.375648-03	2026-09-29 09:00:52.419846-03	2026-09-29 09:00:46.375648-03	2026-09-29 09:00:46.375648-03
689c098b-36b9-49f9-a9db-7592444825a4	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 11:58:38.371742-03	2026-09-22 11:59:24.20583-03	2026-09-22 11:58:38.371742-03	2026-09-22 11:58:38.371742-03
44407335-dbb7-4ae0-b9ad-f326aedd3f45	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	\N	finished	2026-09-22 12:05:03.320002-03	2026-09-22 12:06:02.698159-03	2026-09-22 12:05:03.320002-03	2026-09-22 12:05:03.320002-03
4ae422de-174a-4558-9992-ccde1eba571e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-09-29 16:26:20.742156-03	2026-09-29 16:26:40.604472-03	2026-09-29 16:26:20.742156-03	2026-09-29 16:26:20.742156-03
e062104f-d3fd-4d6d-8d8e-b90bea6dd657	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 13:33:30.457256-03	2026-09-22 13:33:42.780659-03	2026-09-22 13:33:30.457256-03	2026-09-22 13:33:30.457256-03
4b38ef63-ac0e-46f0-85f0-8b5007aa994e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 13:41:35.672689-03	2026-09-22 13:41:49.867416-03	2026-09-22 13:41:35.672689-03	2026-09-22 13:41:35.672689-03
bc7f1ba9-945e-45c0-9280-029d76ee9224	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-30 18:05:48.240801-03	2026-09-30 18:06:01.296564-03	2026-09-30 18:05:48.240801-03	2026-09-30 18:05:48.240801-03
9765ea5e-7b61-42d3-9fd5-204cfb8fddd8	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 13:43:31.916617-03	2026-09-22 13:43:51.37138-03	2026-09-22 13:43:31.916617-03	2026-09-22 13:43:31.916617-03
0e60b048-4d3c-400c-8004-e7c95ae13a65	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-10-01 09:03:35.308805-03	2026-10-01 09:03:49.392838-03	2026-10-01 09:03:35.308805-03	2026-10-01 09:03:35.308805-03
12d8341a-e850-4aa0-ad27-0f291d70f694	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 13:45:21.387841-03	2026-09-22 13:45:36.650515-03	2026-09-22 13:45:21.387841-03	2026-09-22 13:45:21.387841-03
adb77ad2-d053-4288-811c-7908051f7534	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 14:05:32.745452-03	2026-09-22 14:05:53.304458-03	2026-09-22 14:05:32.745452-03	2026-09-22 14:05:32.745452-03
bb0b96f5-80e0-48f9-bd25-1b48701ef143	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-10-01 11:16:11.822075-03	2026-10-01 11:17:12.935709-03	2026-10-01 11:16:11.822075-03	2026-10-01 11:16:11.822075-03
06a4eb8b-7647-48d2-81ec-7b0410db9bfa	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-22 14:06:03.072762-03	2026-09-22 14:06:26.745387-03	2026-09-22 14:06:03.072762-03	2026-09-22 14:06:03.072762-03
516ac0bc-650c-433c-8b4d-1986ab643590	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 08:27:49.902331-03	2026-09-25 08:28:36.117636-03	2026-09-25 08:27:49.902331-03	2026-09-25 08:27:49.902331-03
094b2d02-97d7-47cd-a4b9-b303b02fd70e	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 08:42:43.86924-03	2026-09-25 08:45:03.50661-03	2026-09-25 08:42:43.86924-03	2026-09-25 08:42:43.86924-03
fc1024bc-5f52-48c9-9777-3042439b58da	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 08:53:44.555635-03	2026-09-25 08:54:33.892235-03	2026-09-25 08:53:44.555635-03	2026-09-25 08:53:44.555635-03
120324b3-6181-4dfd-968d-c1c55fd05f4f	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 10:14:30.846677-03	2026-09-25 10:15:03.314566-03	2026-09-25 10:14:30.846677-03	2026-09-25 10:14:30.846677-03
bc404c43-8cca-4c6b-9c1a-324a23fafbc2	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	team	finished	2026-09-25 10:27:43.140249-03	2026-09-25 10:27:53.520364-03	2026-09-25 10:27:43.140249-03	2026-09-25 10:27:43.140249-03
26ae5149-c77d-430a-9085-99a03cefe3a8	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 10:56:12.4066-03	2026-09-25 10:57:20.273211-03	2026-09-25 10:56:12.4066-03	2026-09-25 10:56:12.4066-03
840b198e-9807-41eb-a05d-5984e37b33cb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	\N	finished	2026-09-25 13:07:29.758792-03	2026-09-25 13:07:59.100553-03	2026-09-25 13:07:29.758792-03	2026-09-25 13:07:29.758792-03
cb530c91-df56-41b7-8b70-76b317af69fb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 14:18:47.112443-03	2026-09-25 14:19:10.952002-03	2026-09-25 14:18:47.112443-03	2026-09-25 14:18:47.112443-03
b18d1f16-1b5c-4b4b-89a9-d975e7ef0cdc	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 14:30:46.601945-03	2026-09-25 14:31:22.386693-03	2026-09-25 14:30:46.601945-03	2026-09-25 14:30:46.601945-03
d32ce845-5b59-4df4-8330-a2980ebbc783	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 14:50:38.744568-03	2026-09-25 14:50:53.27895-03	2026-09-25 14:50:38.744568-03	2026-09-25 14:50:38.744568-03
e8bdf9ac-5a9d-42c8-aa15-7916a61cdb74	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-09-25 14:58:46.97204-03	2026-09-25 14:59:36.121528-03	2026-09-25 14:58:46.97204-03	2026-09-25 14:58:46.97204-03
2fadb7cf-131c-43c6-a582-e4e445a50fb6	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 14:59:47.280578-03	2026-09-25 15:00:12.868183-03	2026-09-25 14:59:47.280578-03	2026-09-25 14:59:47.280578-03
efccfb5d-4992-4c2e-b755-08bd9526f525	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 15:07:52.553152-03	2026-09-25 15:08:01.854891-03	2026-09-25 15:07:52.553152-03	2026-09-25 15:07:52.553152-03
3cd3d1bc-6c08-4b88-aeb6-38225a20d7b0	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-09-25 15:12:56.726436-03	2026-09-25 15:13:36.920419-03	2026-09-25 15:12:56.726436-03	2026-09-25 15:12:56.726436-03
c67c3b50-c5ad-4a2d-9b6e-a57ee9a69868	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-09-25 15:47:13.315918-03	2026-09-25 15:47:43.435943-03	2026-09-25 15:47:13.315918-03	2026-09-25 15:47:13.315918-03
18503b8b-bb8c-4a23-bc67-b2089bed02c9	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-10-01 11:19:43.385887-03	2026-10-01 11:36:35.042127-03	2026-10-01 11:19:43.385887-03	2026-10-01 11:19:43.385887-03
6f1d7c80-fa02-400d-bd39-8c3e4902a73c	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-10-01 11:37:00.381581-03	2026-10-01 11:51:59.528259-03	2026-10-01 11:37:00.381581-03	2026-10-01 11:37:00.381581-03
75fadff6-749d-4aaa-a9e6-808737a4fa18	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-10-01 14:43:52.115241-03	2026-10-01 14:44:01.571288-03	2026-10-01 14:43:52.115241-03	2026-10-01 14:43:52.115241-03
7dbf1f67-7c87-4ccf-9186-a63c28bb2692	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-10-01 14:44:59.366043-03	2026-10-01 14:46:12.434955-03	2026-10-01 14:44:59.366043-03	2026-10-01 14:44:59.366043-03
9439c202-549e-4e4f-9cac-961930537981	4695594c-19e9-493f-86a9-dfe79941400e	b58b6207-7348-40fe-b7fc-432212d08534	treasure_hunt	\N	finished	2026-10-01 14:46:21.356122-03	2026-10-01 14:53:06.787084-03	2026-10-01 14:46:21.356122-03	2026-10-01 14:46:21.356122-03
b9ab2197-9ae2-4af1-ad1b-670800872bbb	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-10-01 14:53:20.834009-03	2026-10-01 14:55:05.761179-03	2026-10-01 14:53:20.834009-03	2026-10-01 14:53:20.834009-03
009ddac4-ecd8-467f-97ea-83967bb36d2c	4695594c-19e9-493f-86a9-dfe79941400e	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-10-01 15:04:08.093966-03	2026-10-01 15:05:49.715033-03	2026-10-01 15:04:08.093966-03	2026-10-01 15:04:08.093966-03
73eb75ad-6dad-4645-85ad-babc59883206	909bb418-82c5-4461-869e-72bc9bfbb3aa	f9de27d6-278c-4a9b-8056-2c158c066951	monster_hunt	\N	finished	2026-10-02 16:33:18.215694-03	2026-10-02 16:39:58.729063-03	2026-10-02 16:33:18.215694-03	2026-10-02 16:33:18.215694-03
040638f0-4376-4a2c-b7a1-4b8c2ca877c7	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-10-05 13:49:23.118862-03	2026-10-05 13:49:32.58101-03	2026-10-05 13:49:23.118862-03	2026-10-05 13:49:23.118862-03
9689d552-0d6d-4a80-ba87-b7b37cc920f5	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	zone_conquest	team	finished	2026-10-05 13:50:26.55788-03	2026-10-05 13:51:42.545813-03	2026-10-05 13:50:26.55788-03	2026-10-05 13:50:26.55788-03
24fa6e8b-a9eb-4a87-a13a-a046d7e2718e	c920334b-c141-47ea-a791-dd2c9828be58	6da6e7f8-0358-41e4-8dcd-253df10242bf	zone_conquest	individual	finished	2026-10-05 13:51:53.299363-03	2026-10-05 13:52:32.229405-03	2026-10-05 13:51:53.299363-03	2026-10-05 13:51:53.299363-03
256a4b8e-fe8a-413a-80db-77a0b009161c	c920334b-c141-47ea-a791-dd2c9828be58	b58b6207-7348-40fe-b7fc-432212d08534	treasure_hunt	\N	finished	2026-10-05 13:52:46.731053-03	2026-10-05 13:55:25.926529-03	2026-10-05 13:52:46.731053-03	2026-10-05 13:52:46.731053-03
\.


--
-- Data for Name: time; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."time" ("timeId", evento_id, nome, cor, pontos, created_at, empresa_id) FROM stdin;
aea6e59c-7626-4e57-964a-5bf49620b671	4695594c-19e9-493f-86a9-dfe79941400e	Time 1	#0000FF	10	2026-10-01 11:14:08.887051-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
ABE94F1C-C463-43D7-A4FF-82B2ED69086E	1D7AA6F2-1438-4813-B4ED-4039AC985536	Time Azul	#0000FF	0	2026-07-13 09:20:29.2-03	\N
3e781f1a-bd88-426c-b2de-d47f2489cc65	c920334b-c141-47ea-a791-dd2c9828be58	Time 1	#1d7312	40	2026-10-05 09:48:51.909695-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
745f9a93-1cf4-4c27-bbb8-553ecdf93af4	cb2c9907-c412-4cf3-9b36-59b41e5e9d0b	Aguas	#00FFFF	0	2026-07-28 14:43:48.906894-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
fa43ca59-2c7f-4c9c-a876-89a00bb59203	cb2c9907-c412-4cf3-9b36-59b41e5e9d0b	Flores	#AA00FF	0	2026-07-28 14:44:01.232397-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
697df292-ec0f-40e5-97d5-1c77c6e539ff	c920334b-c141-47ea-a791-dd2c9828be58	Time 2	#81137d	280	2026-10-05 09:49:04.724429-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
647c6bb8-c2ee-4147-89bc-d632deff4d18	909bb418-82c5-4461-869e-72bc9bfbb3aa	Time 2	#FF0000	660	2026-10-02 15:12:42.328295-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
a8238112-f78c-4a80-95d3-4d18336f1318	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	CAVALEIROS	#FF6600	260	2026-07-20 11:52:36.263-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
ee6e06c5-e771-4390-b4ae-f038bf55edeb	\N	Time dos Monstros	#CD2323	0	2026-10-05 10:44:40.937099-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
aed1ada8-5e5f-4a9e-a07d-1ada4e392f48	\N	Time dos HerÃ³is	#1B05C2	0	2026-10-05 10:45:11.338859-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
a860b67a-3be9-420f-a280-3ff62e71134a	c920334b-c141-47ea-a791-dd2c9828be58	Time dos Monstros	#CD2323	0	2026-10-05 11:30:24.868085-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
c96225d3-39b8-4f3c-ad62-2f958dab2e9e	c920334b-c141-47ea-a791-dd2c9828be58	Time dos HerÃ³is	#1B05C2	0	2026-10-05 11:30:24.868085-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
e4feef99-4920-4c40-b3c2-1c3a31c62f08	4695594c-19e9-493f-86a9-dfe79941400e	Time 2	#FF0000	0	2026-10-01 11:14:13.761959-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
3218d5b4-372e-424e-9d91-dedea2b741f3	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	AGUIAS	#651881	420	2026-07-17 11:13:34.147-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
e36f8423-3467-4c88-8d45-238400074aab	909bb418-82c5-4461-869e-72bc9bfbb3aa	Time azul	#0000FF	70	2026-10-02 11:52:52.756485-03	c9287e4b-399d-4764-8bff-2e0ce7058dcb
\.


--
-- Data for Name: vinculoFamiliar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."vinculoFamiliar" ("vinculoId", "loginId", "criancaId", "empresaId", relacionamento, status, "aprovadoPor", "aprovadoEm", "rejeitadoEm", "criadoEm") FROM stdin;
1095aa60-2228-4728-94cf-4096bfb2a694	218e9825-52fe-410d-9f0b-830bba985938	21270cc5-202f-4600-a6d0-c5acb1819c8b	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	approved	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 15:45:58.352903-03	\N	2026-09-22 14:32:29.766765-03
99a59917-2cce-43d7-8bee-93662eabd894	4ddf6bfd-072a-4bbe-b76a-d1681b0d2d13	b35dc997-34bf-4a71-8297-3867588be4cc	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	approved	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 15:45:59.831842-03	\N	2026-09-22 15:45:39.555267-03
62e88025-5b4e-4c7e-979b-c847a42abd13	c7234ca6-a5c5-403a-9528-45d964859785	3702367e-e183-4b87-8f7c-30bcba0df56f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	approved	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 15:46:02.237308-03	\N	2026-09-22 14:35:15.224555-03
8469288b-5149-477d-a060-d4fc371dfd77	86fc3d17-3592-4c10-adb5-7e92a8ed0c21	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	rejected	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-15 17:12:55.894992-03	2026-09-22 11:49:33.498674-03	2026-09-15 16:43:27.700415-03
ed4a7b8d-fb97-4f4d-9f54-9bf9781fffb5	86fc3d17-3592-4c10-adb5-7e92a8ed0c21	5c02da21-8385-41e7-9f76-990d313adeef	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	rejected	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-15 17:12:58.836786-03	2026-09-22 11:49:34.924093-03	2026-09-15 17:00:54.90748-03
88177713-8509-487e-8823-94f3a0158733	b86f2f81-c54c-4618-a3eb-913c35fbc099	95084f3d-0f22-40f1-9092-75637c64d23a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	approved	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-22 14:23:51.994712-03	\N	2026-09-22 14:19:08.784225-03
952d1a16-1eec-4f8d-a61d-b9f44e8cb544	b86f2f81-c54c-4618-a3eb-913c35fbc099	843c8267-a16c-4753-8bc8-dc7d22c89978	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	rejected	\N	\N	2026-09-22 14:24:01.499146-03	2026-09-22 14:21:10.044631-03
6c769012-a95c-45f4-a23e-3e8f8bbc1c70	86fc3d17-3592-4c10-adb5-7e92a8ed0c21	fc46b33d-f0fd-4ec2-8533-47026eccf79a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	rejected	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-15 17:12:57.929845-03	2026-09-29 16:55:38.68689-03	2026-09-15 16:58:59.921012-03
3521a4d2-784d-4a6a-975f-54d224eb7b19	cf62d6f3-ddfe-4985-a9e8-5f733abe0bfd	816a3a4f-8146-448c-bddb-c4e58ba7c9d9	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	rejected	\N	\N	2026-09-29 16:55:40.175699-03	2026-09-25 15:36:52.073251-03
7dbdf223-a2fb-4c17-8da2-1efe15bbfabd	d88ce8f9-5e2a-4419-8d2a-d960135538a0	fc46b33d-f0fd-4ec2-8533-47026eccf79a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	approved	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-29 17:18:37.286625-03	\N	2026-09-29 17:08:23.106171-03
58acc3fa-ca4b-46b9-9330-7b22dfaf7649	86fc3d17-3592-4c10-adb5-7e92a8ed0c21	1fd20c90-b3c8-4bc9-a556-fa88cea6865f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	inactive	\N	\N	\N	2026-09-29 17:20:45.846337-03
e1d808a0-733a-48cc-98fa-2e23e0ec94ac	86fc3d17-3592-4c10-adb5-7e92a8ed0c21	2b46479e-8673-4461-b4dc-1c3a278a15e4	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	inactive	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-10-01 15:03:31.773876-03	\N	2026-10-01 15:00:41.794517-03
75b47641-66af-48e9-8566-68bd2302839d	554533a9-a324-42ee-8b30-21818c666ed7	5791eb07-e3f1-4233-aa7c-e3a93afa5502	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	approved	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-09-29 10:19:16.695739-03	\N	2026-09-29 10:18:52.497268-03
1daafab0-e0c9-4480-9585-15610787f74c	86fc3d17-3592-4c10-adb5-7e92a8ed0c21	749fc814-f8ec-4587-b1fb-4df04cf71a75	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	inactive	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-10-01 15:10:41.502332-03	\N	2026-09-15 16:44:57.696839-03
9bd84446-4b92-4421-bb91-f631fb1c82c4	eb308270-a0ea-46d5-a252-ad4847957d92	36130719-fb5c-4bad-aec2-2d95d27ac770	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	inactive	\N	\N	\N	2026-10-02 12:24:38.93426-03
830df108-8069-410b-a213-5d9c4460169b	86fc3d17-3592-4c10-adb5-7e92a8ed0c21	eab8abf2-ed02-4299-b063-980a9c966ec3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	approved	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-10-02 16:57:12.786863-03	\N	2026-10-02 16:55:55.92317-03
af21ed15-d1fc-4d87-b7db-e59051abf586	eb308270-a0ea-46d5-a252-ad4847957d92	eab8abf2-ed02-4299-b063-980a9c966ec3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	responsÃ¡vel	approved	f382c9d4-9c90-4369-baac-8feb8b5316c3	2026-10-02 16:58:13.48242-03	\N	2026-10-02 15:21:28.207163-03
\.


--
-- Data for Name: zona; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zona ("zonaId", evento_id, nome, cor, x, y, width, height, created_at) FROM stdin;
\.


--
-- Data for Name: zonaConquistaLeituraIndividual; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."zonaConquistaLeituraIndividual" (id, partida_id, empresa_id, evento_id, brincadeira_id, checkpoint_id, crianca_id, uid, leitura_id, points_awarded, version, scanned_at, created_at) FROM stdin;
fa1d1313-80bd-4244-befb-a4a254696f4b	d01842a2-6aa3-4cff-a11f-77c904f83ba1	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4ddf948c6434eb	10.00	1	2026-09-22 13:47:52.625-03	2026-09-22 13:47:52.695105-03
be62ba70-f8b1-4e1a-b653-e71ed255182d	eccbabb7-c970-4b46-be98-2f2ade73529c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4ddf948c65f8f4	10.00	1	2026-09-22 13:49:48.344-03	2026-09-22 13:49:48.413092-03
69bc9fd4-1808-4898-8580-f319ae446b95	c57ba5ca-f7f6-4de0-ac41-78b702438290	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4ddf948c68d227	10.00	1	2026-09-22 13:52:55.032-03	2026-09-22 13:52:55.10134-03
3b68f2b1-7934-4ac8-8dd9-fe0668eb5aa1	adcbf7dd-3b68-434b-ab67-d0091615ddfd	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4ddf948c7478aa	10.00	1	2026-09-22 14:05:38.519-03	2026-09-22 14:05:38.619841-03
94e2f553-3687-43b6-9d21-817903bc0bc2	6aa22ffc-b34d-4dd9-af58-104a7722b8ec	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4ddf948c74f3eb	10.00	1	2026-09-22 14:06:10.11-03	2026-09-22 14:06:10.165183-03
ebbf598c-4610-4139-be8c-4f089c91b3c7	6aa22ffc-b34d-4dd9-af58-104a7722b8ec	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	5	749fc814-f8ec-4587-b1fb-4df04cf71a75	4CF30272	4ddf948c66ca	10.00	1	2026-09-22 17:17:05.638-03	2026-09-22 17:17:05.812544-03
9ee333a3-a38b-4710-9a88-79c54653af57	6aa22ffc-b34d-4dd9-af58-104a7722b8ec	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c7e62	10.00	1	2026-09-22 17:17:11.678-03	2026-09-22 17:17:11.741963-03
6796b02d-706d-419f-b741-301e2e036ecf	6aa22ffc-b34d-4dd9-af58-104a7722b8ec	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c92c2	10.00	1	2026-09-22 17:17:16.898-03	2026-09-22 17:17:16.962339-03
24647d93-4e60-4946-b5ad-1608278668e9	6aa22ffc-b34d-4dd9-af58-104a7722b8ec	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	749fc814-f8ec-4587-b1fb-4df04cf71a75	4CF30272	4cdf948c14ca5	10.00	2	2026-09-22 17:18:04.469-03	2026-09-22 17:18:04.533389-03
b56058d9-d6e8-4ff6-b38e-c5fcff19af58	6aa22ffc-b34d-4dd9-af58-104a7722b8ec	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c15507	10.00	2	2026-09-22 17:18:06.637-03	2026-09-22 17:18:06.695296-03
2dbb2b54-9f89-431c-a4f7-89f4712cb835	6aa22ffc-b34d-4dd9-af58-104a7722b8ec	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	5	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4ddf948c15f06	10.00	2	2026-09-22 17:18:09.18-03	2026-09-22 17:18:09.23801-03
376af6ed-1a55-42df-b10c-84a170e3ca4b	6aa22ffc-b34d-4dd9-af58-104a7722b8ec	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	749fc814-f8ec-4587-b1fb-4df04cf71a75	4CF30272	4cdf948c1745b	10.00	3	2026-09-22 17:18:14.638-03	2026-09-22 17:18:14.703165-03
ced1aa1c-5451-4ac5-9c89-4a546bacf933	6aa22ffc-b34d-4dd9-af58-104a7722b8ec	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	749fc814-f8ec-4587-b1fb-4df04cf71a75	4CF30272	4cdf948c17a3d	10.00	4	2026-09-22 17:18:16.151-03	2026-09-22 17:18:16.209506-03
6f4d368c-141b-49fb-ac68-2ece84f6eb77	6aa22ffc-b34d-4dd9-af58-104a7722b8ec	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	5	749fc814-f8ec-4587-b1fb-4df04cf71a75	4CF30272	4ddf948c17ca1	10.00	5	2026-09-22 17:18:16.752-03	2026-09-22 17:18:16.810659-03
26f6b3a1-87ae-49b4-aa9a-482a7f5f56c6	1792f5a2-40e1-4791-86f6-9a91f8b75320	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c86a4d	10.00	1	2026-09-25 08:21:46.745-03	2026-09-25 08:21:46.806421-03
21857a7f-b375-4f94-b50c-7ed03eff96fe	1792f5a2-40e1-4791-86f6-9a91f8b75320	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	749fc814-f8ec-4587-b1fb-4df04cf71a75	4CF30272	4cdf948c88f7a	10.00	1	2026-09-25 08:21:56.272-03	2026-09-25 08:21:56.324308-03
b1c0e8f5-5c25-47ba-98b7-488e822f0846	6ff30257-c1a6-4872-bc5a-3492eda1b1fe	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c1dd8ec	10.00	1	2026-09-25 08:45:11.302-03	2026-09-25 08:45:11.38268-03
2434d009-c6f4-4ff6-beef-eba63118caba	6ff30257-c1a6-4872-bc5a-3492eda1b1fe	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c1e212b	10.00	2	2026-09-25 08:45:29.802-03	2026-09-25 08:45:29.859693-03
e3451125-308a-4cc4-a428-395ef4770282	2e356c7a-e05f-444f-a716-77233db25642	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c217a53	10.00	1	2026-09-25 08:49:09.224-03	2026-09-25 08:49:09.287302-03
43c09776-8b91-4d4d-a9b2-78660df47ac7	2e356c7a-e05f-444f-a716-77233db25642	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c2198a0	10.00	2	2026-09-25 08:49:17.009-03	2026-09-25 08:49:17.057982-03
511eb519-c121-40bd-b473-725fe41c0e5a	5bada1c9-7ce6-4988-a3fe-a8a706252d9d	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c254da3	10.00	1	2026-09-25 08:53:19.932-03	2026-09-25 08:53:20.024109-03
876f8ce0-718a-452d-b576-30b8ef53a712	5bada1c9-7ce6-4988-a3fe-a8a706252d9d	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c2561f3	10.00	2	2026-09-25 08:53:25.135-03	2026-09-25 08:53:25.211194-03
3d778133-2b1e-4d7c-ac1a-c1f4e435c028	92e51a53-999c-48f2-9ec9-852f0f6776a7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c6faa3f	10.00	1	2026-09-25 10:14:33.294-03	2026-09-25 10:14:33.400812-03
328a7c37-e912-4c31-8853-2740861ed403	92e51a53-999c-48f2-9ec9-852f0f6776a7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c6fc776	10.00	2	2026-09-25 10:14:40.752-03	2026-09-25 10:14:40.809371-03
85e3e34a-4cc7-47d3-83d4-8f5357b6991e	bd105d77-5407-4de7-9634-e4ac349d6ff8	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c7958ad	10.00	1	2026-09-25 10:25:07.745-03	2026-09-25 10:25:07.816684-03
aeaaec6e-3bc0-4b24-b900-153c6570fda7	bd105d77-5407-4de7-9634-e4ac349d6ff8	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c796eab	10.00	2	2026-09-25 10:25:13.376-03	2026-09-25 10:25:13.427559-03
617d5c3a-3232-47d6-b021-b684751adf70	bd105d77-5407-4de7-9634-e4ac349d6ff8	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c797372	10.00	3	2026-09-25 10:25:14.612-03	2026-09-25 10:25:14.678695-03
74521b1f-4512-43c2-9c7c-bbfa85db034f	667d4441-6d35-46ba-9866-13dffc6f44ed	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4cdf948ca0230c	10.00	1	2026-09-25 11:07:29.895-03	2026-09-25 11:07:29.963129-03
3d78a798-5fa9-4592-9fa3-4d3159476129	667d4441-6d35-46ba-9866-13dffc6f44ed	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4cdf948ca04320	10.00	2	2026-09-25 11:07:38.122-03	2026-09-25 11:07:38.177303-03
91c1ca6a-cec2-4726-9ab8-30e3a10f77d7	09bc52f7-7651-4ac8-bcaa-107acfeb7a51	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c10e1145	10.00	1	2026-09-25 13:07:34.27-03	2026-09-25 13:07:34.355914-03
e4b16752-200a-4cca-aedf-6cf71ccc8d79	09bc52f7-7651-4ac8-bcaa-107acfeb7a51	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c10e27a1	10.00	2	2026-09-25 13:07:40.003-03	2026-09-25 13:07:40.055488-03
bc08cf32-58cf-44dd-927c-6eccefd3899a	c81bc7b4-38b2-44db-96a6-f49371a4553f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c13ace27	10.00	1	2026-09-25 13:56:26.198-03	2026-09-25 13:56:26.282954-03
83a80df3-3342-44be-bfe3-e64ae3a11ef2	c81bc7b4-38b2-44db-96a6-f49371a4553f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c13ae3f5	10.00	2	2026-09-25 13:56:31.77-03	2026-09-25 13:56:31.823087-03
3a8b0368-d01f-4fc9-b48d-38655177b807	606b966d-1b2b-44ad-aa5d-321494ea950f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c14f57d1	10.00	1	2026-09-25 14:18:52.143-03	2026-09-25 14:18:52.217939-03
40e29fdf-ff55-4437-9d9b-c913d519b741	606b966d-1b2b-44ad-aa5d-321494ea950f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c14f7964	10.00	2	2026-09-25 14:19:00.736-03	2026-09-25 14:19:00.800618-03
1ffe6836-6c94-4ce7-a61f-855d73a7f643	c374d9aa-df58-4f8d-9f2d-cf6e56f06b6e	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c152db60	10.00	1	2026-09-25 14:22:42.424-03	2026-09-25 14:22:42.508212-03
9ca68244-3b16-488b-99fc-667ea1f8e2fb	c374d9aa-df58-4f8d-9f2d-cf6e56f06b6e	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c152f010	10.00	2	2026-09-25 14:22:47.724-03	2026-09-25 14:22:47.779847-03
bd17e29a-4db9-43ee-8861-d6002699f67d	ac47673c-843e-4f86-9342-b70d6e441c4f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c15365bc	10.00	1	2026-09-25 14:23:17.843-03	2026-09-25 14:23:17.91155-03
80c36f5a-b9a9-48e2-bb64-b3c95348fe35	ce91bfb9-968c-4939-a7b0-56176454dfc2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c15406a8	10.00	1	2026-09-25 14:23:59.049-03	2026-09-25 14:23:59.105654-03
1923bbaa-ceed-4361-a503-31a4b8dd75d5	ac47673c-843e-4f86-9342-b70d6e441c4f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c1537ec2	10.00	2	2026-09-25 14:23:24.253-03	2026-09-25 14:23:24.310414-03
bd5c6fd4-0f01-4f9e-ad82-da785b64cbbe	d607d2bb-dc06-48b1-9f5d-db4e1901a87f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c160e08f	10.00	2	2026-09-25 14:38:01.376-03	2026-09-25 14:38:01.423746-03
99b918d1-23d0-41e5-abd3-758437289b4f	d607d2bb-dc06-48b1-9f5d-db4e1901a87f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4cdf948c16104f5	10.00	1	2026-09-25 14:38:10.641-03	2026-09-25 14:38:10.694374-03
90a3e003-dffa-46c5-ae44-fec08c49d507	d607d2bb-dc06-48b1-9f5d-db4e1901a87f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	749fc814-f8ec-4587-b1fb-4df04cf71a75	4CF30272	4cdf948c16134f7	10.00	1	2026-09-25 14:38:22.854-03	2026-09-25 14:38:22.911781-03
36fe09a0-0e76-49f1-b508-992b6b9c9217	ce91bfb9-968c-4939-a7b0-56176454dfc2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c1541e3f	10.00	2	2026-09-25 14:24:05.088-03	2026-09-25 14:24:05.156937-03
8956f17a-f786-4847-9d0a-867d1a5ad257	ce91bfb9-968c-4939-a7b0-56176454dfc2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c154383b	10.00	1	2026-09-25 14:24:11.74-03	2026-09-25 14:24:11.829365-03
e358f1f1-3691-4ec1-83c4-6101fca4735e	ce91bfb9-968c-4939-a7b0-56176454dfc2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c154be26	10.00	3	2026-09-25 14:24:46.016-03	2026-09-25 14:24:46.069245-03
f3f00984-a305-4ae1-81f6-ff6273a4e8b7	ce91bfb9-968c-4939-a7b0-56176454dfc2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c15451d7	10.00	2	2026-09-25 14:24:18.294-03	2026-09-25 14:24:18.365458-03
818a028a-ab2c-4e49-bfda-71a209ed1cb3	ce91bfb9-968c-4939-a7b0-56176454dfc2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c154d6e9	10.00	4	2026-09-25 14:24:52.358-03	2026-09-25 14:24:52.413023-03
001a40a5-4e5e-49fa-aa7c-bf882a705981	4539d949-c95b-4ab7-afbb-795355921d00	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4cdf948c15a4ca3	10.00	1	2026-09-25 14:30:50.242-03	2026-09-25 14:30:50.315024-03
fc3cef0c-fe68-4019-be2a-b5c1b19d286f	4539d949-c95b-4ab7-afbb-795355921d00	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4cdf948c15a6740	10.00	2	2026-09-25 14:30:56.985-03	2026-09-25 14:30:57.053288-03
31d9f3cd-2e36-41c0-aea0-a6b8dc5dbde3	4539d949-c95b-4ab7-afbb-795355921d00	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c15a8de1	10.00	1	2026-09-25 14:31:06.894-03	2026-09-25 14:31:06.959133-03
ff7d6661-ba56-43a6-9e64-9d3ef7a267b9	4539d949-c95b-4ab7-afbb-795355921d00	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c15aa72e	10.00	2	2026-09-25 14:31:13.349-03	2026-09-25 14:31:13.404913-03
98bfaab8-3b26-40b5-ac80-6983bf4cee07	d607d2bb-dc06-48b1-9f5d-db4e1901a87f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c16093d7	10.00	1	2026-09-25 14:37:41.62-03	2026-09-25 14:37:41.696229-03
b6d6d10f-c6e4-4679-b820-18f57e57685c	d607d2bb-dc06-48b1-9f5d-db4e1901a87f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c160acba	10.00	2	2026-09-25 14:37:48.247-03	2026-09-25 14:37:48.304509-03
7f6e9959-d7e1-4109-83ac-a91e144e2f5c	d607d2bb-dc06-48b1-9f5d-db4e1901a87f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c160cb62	10.00	1	2026-09-25 14:37:55.837-03	2026-09-25 14:37:55.89278-03
96b342d1-7451-40ac-9a31-1b0b8a084766	d607d2bb-dc06-48b1-9f5d-db4e1901a87f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4cdf948c1610f57	10.00	2	2026-09-25 14:38:13.23-03	2026-09-25 14:38:13.28118-03
0cdf53d8-2467-4441-9e8b-57dd3baa4023	d607d2bb-dc06-48b1-9f5d-db4e1901a87f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	749fc814-f8ec-4587-b1fb-4df04cf71a75	4CF30272	4cdf948c1613d52	10.00	2	2026-09-25 14:38:25.005-03	2026-09-25 14:38:25.050914-03
bb8b930d-4b85-48e5-afd9-9bbac06aacca	3cf5124d-404d-4960-9efd-87c5a58692de	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c165fc23	10.00	1	2026-09-25 14:43:35.994-03	2026-09-25 14:43:36.077746-03
73b23328-9d30-40be-b2f8-8581db55282c	3cf5124d-404d-4960-9efd-87c5a58692de	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c166148a	10.00	2	2026-09-25 14:43:42.246-03	2026-09-25 14:43:42.29864-03
dc9fce26-c516-41ce-8468-4ce0c25fb814	1775d536-a4cf-405d-97a2-845fa7fc5b20	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4cdf948c173f9db	10.00	1	2026-09-25 14:58:52.9-03	2026-09-25 14:58:52.976549-03
a1be613d-1f8f-47e3-b2e9-c933388e76a6	1775d536-a4cf-405d-97a2-845fa7fc5b20	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4cdf948c1740f71	10.00	2	2026-09-25 14:58:58.709-03	2026-09-25 14:58:58.775577-03
b43727a8-3ca6-4d49-a908-4cb00ef83a50	1775d536-a4cf-405d-97a2-845fa7fc5b20	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c1742bd9	10.00	1	2026-09-25 14:59:05.709-03	2026-09-25 14:59:05.78706-03
7ace3be8-a084-4744-b359-34ca8f653e60	1775d536-a4cf-405d-97a2-845fa7fc5b20	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c174509e	10.00	2	2026-09-25 14:59:15.122-03	2026-09-25 14:59:15.181515-03
b2c9d05b-0df3-4806-a834-91d1f83387cf	708806d7-1508-4610-afdf-3210651f62d3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c1a1a7a7	10.00	1	2026-09-25 15:48:46.5-03	2026-09-25 15:48:46.595651-03
2be044f4-b0d3-4174-ba55-eff55084eefc	708806d7-1508-4610-afdf-3210651f62d3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4cdf948c1a1c9fc	10.00	1	2026-09-25 15:48:55.291-03	2026-09-25 15:48:55.361467-03
371fa996-9fb3-4013-b9c7-fdd6bcb284e3	708806d7-1508-4610-afdf-3210651f62d3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	749fc814-f8ec-4587-b1fb-4df04cf71a75	4CF30272	4cdf948c1a20f92	10.00	1	2026-09-25 15:49:13.106-03	2026-09-25 15:49:13.164377-03
57f7c486-e290-47d9-9bae-c2c1082ea5ee	708806d7-1508-4610-afdf-3210651f62d3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c1a2d100	10.00	2	2026-09-25 15:50:02.624-03	2026-09-25 15:50:02.668295-03
15c7c054-e447-467e-abae-3bed5991cb21	708806d7-1508-4610-afdf-3210651f62d3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	C7DD6359	4cdf948c1a2e506	10.00	2	2026-09-25 15:50:07.744-03	2026-09-25 15:50:07.794489-03
e87608b3-3ba7-4447-9021-9bee1d80ee61	708806d7-1508-4610-afdf-3210651f62d3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c1a32d62	10.00	1	2026-09-25 15:50:26.266-03	2026-09-25 15:50:26.348426-03
fcd988c6-1745-4e27-8ba2-54343f4be83f	708806d7-1508-4610-afdf-3210651f62d3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	5c02da21-8385-41e7-9f76-990d313adeef	17128659	4cdf948c1a33a88	10.00	2	2026-09-25 15:50:29.637-03	2026-09-25 15:50:29.695443-03
89d935d1-be87-4c74-9a08-ba537e5133e6	b0526759-0063-4a4d-9c31-a9680c1da759	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c1bffd6c	10.00	1	2026-09-25 16:21:54.518-03	2026-09-25 16:21:54.586828-03
d75626f7-d62f-461d-bdd0-7e70ba5fa22a	b0526759-0063-4a4d-9c31-a9680c1da759	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	D79D7859	4cdf948c1c01f86	10.00	2	2026-09-25 16:22:03.26-03	2026-09-25 16:22:03.342531-03
9f223f2d-5bdd-4688-bad7-90366a8a2877	3fac69b6-378d-4ca4-9cd8-f2151f7d9759	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	6da6e7f8-0358-41e4-8dcd-253df10242bf	15	b3ee6536-ebd0-431d-b106-4ebde945cc9b	04F0B45ABB2190	2ca4b702dfbc	10.00	1	2026-10-05 13:52:01.166-03	2026-10-05 13:52:01.265339-03
a88ef7aa-0883-4926-affc-66a550d07e76	3fac69b6-378d-4ca4-9cd8-f2151f7d9759	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	6da6e7f8-0358-41e4-8dcd-253df10242bf	10	b3ee6536-ebd0-431d-b106-4ebde945cc9b	04F0B45ABB2190	4ddf948c77386	10.00	2	2026-10-05 13:52:09.616-03	2026-10-05 13:52:09.673908-03
e616ea6e-2fe1-4dad-b363-ab5824a77a69	3fac69b6-378d-4ca4-9cd8-f2151f7d9759	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	6da6e7f8-0358-41e4-8dcd-253df10242bf	12	b3ee6536-ebd0-431d-b106-4ebde945cc9b	04F0B45ABB2190	d1abc31c74ccf	10.00	3	2026-10-05 13:52:15.65-03	2026-10-05 13:52:15.711266-03
06d42f45-ee5a-45b1-a8c4-a20420ed07b3	3fac69b6-378d-4ca4-9cd8-f2151f7d9759	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	6da6e7f8-0358-41e4-8dcd-253df10242bf	14	b3ee6536-ebd0-431d-b106-4ebde945cc9b	04F0B45ABB2190	89a99b206c703	10.00	4	2026-10-05 13:52:20.356-03	2026-10-05 13:52:20.423622-03
\.


--
-- Data for Name: zonaConquistaLeituraTime; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."zonaConquistaLeituraTime" (id, partida_id, empresa_id, evento_id, brincadeira_id, round_number, checkpoint_id, crianca_id, time_id, uid, leitura_id, points_awarded, scanned_at, created_at) FROM stdin;
a10e0190-9cb6-44c0-bbb0-b4881335f65b	549f9e45-f4c3-4a48-a912-53ed2a5a13c4	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4ddf948cb46c	10.00	2026-09-22 08:12:59.773-03	2026-09-22 08:12:59.847624-03
1219f115-8f1b-4f36-ada4-3f11751c2bc3	5e72a237-18b0-4755-a51a-15017adf189c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4ddf948c2108f	10.00	2026-09-22 08:14:28.889-03	2026-09-22 08:14:28.938999-03
e9788972-86b3-47ce-8622-d97249b3d550	cbfec570-a760-42e8-b913-6688d55655fc	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4ddf948c81b36	10.00	2026-09-22 08:21:04.869-03	2026-09-22 08:21:04.923148-03
c61e23cf-16c3-45b1-84d0-7dcd1c384ae1	2cdb4abd-3050-4ce3-97c8-96a3f834edbd	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4ddf948c3ce72	10.00	2026-09-22 11:29:59.356-03	2026-09-22 11:29:59.40296-03
c4542c99-b729-457c-8a7e-0c02bc9e4c70	42e4bd2d-679e-4e74-b07f-8c5b7f53d527	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4ddf948c647d6	10.00	2026-09-22 11:32:41.509-03	2026-09-22 11:32:41.552576-03
b0137a3c-0d2c-41af-9ca8-34ef672c06e2	67d3edfb-1580-4575-a6fe-c2cb684d7ebb	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4ddf948c962bf	10.00	2026-09-22 11:36:04.982-03	2026-09-22 11:36:05.032688-03
2d40a60d-185a-4a19-947f-aa2519fb90cb	a6fe972b-85d0-4f78-9941-840a6bc87cf5	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4ddf948cc04bf	10.00	2026-09-22 11:38:57.539-03	2026-09-22 11:38:57.601815-03
45dccce6-7fb1-4784-b715-59da924f5729	f2806b3f-f9eb-4fd1-a1cf-69f7fda3ab9c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4ddf948cc504e	10.00	2026-09-22 11:39:16.887-03	2026-09-22 11:39:16.934615-03
3cd33a6b-e568-46ac-9628-4e5325a3d230	dc3271ef-b186-43fe-837c-3939b802c36f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	1	5	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4ddf948cc8eab	10.00	2026-09-22 11:39:32.837-03	2026-09-22 11:39:32.890064-03
52fff777-93f2-430e-9405-40ed21247d70	a164ea54-0091-42c8-80a5-554ffe5f2e41	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4ddf948cf370f	10.00	2026-09-22 11:42:27.018-03	2026-09-22 11:42:27.10749-03
a8a475d2-f45a-445c-818e-4eb289827d1a	b475df40-b829-4a2d-aad0-2bd8f0a263ff	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4ddf948c10ae2c	10.00	2026-09-22 11:44:03.028-03	2026-09-22 11:44:03.088829-03
5079dfaa-814a-4854-b73b-6c1f0f87a3e4	12a6a4ed-7a4c-4e67-942f-b406feadeffb	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4ddf948c10e52a	10.00	2026-09-22 11:44:17.113-03	2026-09-22 11:44:17.172338-03
e4545c1c-ab3a-495d-9ff1-0fe90c20897d	313717f0-47f8-4012-80ce-80d5dabe2af3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4ddf948c12bc92	10.00	2026-09-22 11:46:17.797-03	2026-09-22 11:46:17.846623-03
57b7626f-e909-4641-ab15-2da21aa8eb0b	3d888b76-9d76-45c0-822e-d24c56b0993e	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4ddf948c151149	10.00	2026-09-22 11:48:50.535-03	2026-09-22 11:48:50.583935-03
e8b5334f-f85b-4f5e-9c0f-cf9a5378d7fe	d487e00a-5ac2-42cd-ac8a-4f6354dee36e	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4ddf948c17a642	10.00	2026-09-22 11:51:39.797-03	2026-09-22 11:51:39.849075-03
b177b691-4001-4982-bc04-29b27d424e99	706d444f-f542-4d54-8e2d-79c5e8956222	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4ddf948c4dae	10.00	2026-09-22 11:58:45.539-03	2026-09-22 11:58:45.600578-03
6bd5b620-3c17-4768-a301-7284c26b7517	706d444f-f542-4d54-8e2d-79c5e8956222	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c5c5d	10.00	2026-09-22 11:58:49.313-03	2026-09-22 11:58:49.364559-03
c703affd-846d-48ee-82d6-8c533633ea3b	706d444f-f542-4d54-8e2d-79c5e8956222	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948ccd86	10.00	2026-09-22 11:59:18.282-03	2026-09-22 11:59:18.331916-03
381f6b96-559a-46fe-b797-c27bb368403e	fcbfcdc8-dbfd-4a6b-b53f-bb34adb7a0c7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4ddf948c5cd80	10.00	2026-09-22 12:04:45.939-03	2026-09-22 12:04:46.426863-03
ae584770-b44a-412f-93be-d67a214381c8	fcbfcdc8-dbfd-4a6b-b53f-bb34adb7a0c7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4cdf948c5e125	10.00	2026-09-22 12:04:50.994-03	2026-09-22 12:04:51.039733-03
fcd7179f-bf20-4832-8c8b-2ed34564fbeb	fcbfcdc8-dbfd-4a6b-b53f-bb34adb7a0c7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4cdf948c5ee41	10.00	2026-09-22 12:04:54.34-03	2026-09-22 12:04:54.411856-03
016fbaf3-cadf-4732-a8d0-0d72c0127c73	a90f8754-2632-41ab-a583-f0d2514056f2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	5	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4ddf948c6b338	10.00	2026-09-22 12:05:44.745-03	2026-09-22 12:05:44.789752-03
91831627-4964-4b95-8539-38cbafae8033	a90f8754-2632-41ab-a583-f0d2514056f2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c6c3bb	10.00	2026-09-22 12:05:49.004-03	2026-09-22 12:05:49.048436-03
31b02327-743c-4829-8c3a-103c73e12306	a90f8754-2632-41ab-a583-f0d2514056f2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c6c73c	10.00	2026-09-22 12:05:50.061-03	2026-09-22 12:05:50.113276-03
4b6e2918-3fb6-45f8-9475-b5b13832ebce	d84c3270-08e1-4ab7-9b21-1d049ceba5d6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	1	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c9702e	10.00	2026-09-22 12:08:44.45-03	2026-09-22 12:08:44.516123-03
28fb4a07-95cd-4058-aa61-3632b81c13cd	d84c3270-08e1-4ab7-9b21-1d049ceba5d6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	1	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c981e6	10.00	2026-09-22 12:08:48.823-03	2026-09-22 12:08:48.870815-03
42090242-59f9-49a2-b009-ade4b90eb302	a8e37425-5b60-4b9d-be92-720c1d083aae	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c8ce9e3	10.00	2026-09-25 10:46:30.094-03	2026-09-25 10:46:30.142963-03
b91fa345-73c1-40e1-93e0-3ef18741f2f8	a8e37425-5b60-4b9d-be92-720c1d083aae	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c8d0717	10.00	2026-09-25 10:46:37.584-03	2026-09-25 10:46:37.637896-03
a67b44e8-4412-444c-b66d-b6fee8272b7a	2841bbc6-1586-45d0-a1cd-7d90527c4702	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c963f8b	10.00	2026-09-25 10:56:41.85-03	2026-09-25 10:56:41.898555-03
88b2ccec-7b54-4fff-b2a6-89c9aac558f6	2841bbc6-1586-45d0-a1cd-7d90527c4702	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c9665f1	10.00	2026-09-25 10:56:51.683-03	2026-09-25 10:56:51.729537-03
65b8a746-3525-42ea-9417-4ab8e3713f8e	2b6dc512-a630-468d-9bd4-5ad086931084	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c9f81a4	10.00	2026-09-25 11:06:48.59-03	2026-09-25 11:06:48.649044-03
93bfae42-70e9-4ec7-9c22-87ea28820f3f	2b6dc512-a630-468d-9bd4-5ad086931084	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c9fb06d	10.00	2026-09-25 11:07:00.568-03	2026-09-25 11:07:00.615923-03
fb51a76a-9c48-436c-a230-05d6ae4f6e63	4ec542f8-a98e-4d6f-a22f-ad8e02492811	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c17c76ed	10.00	2026-09-25 15:08:09.224-03	2026-09-25 15:08:09.280886-03
5ae8abb0-a787-4b08-8c87-3a93c8e63da4	4ec542f8-a98e-4d6f-a22f-ad8e02492811	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c17c83af	10.00	2026-09-25 15:08:12.474-03	2026-09-25 15:08:12.514643-03
b8201b10-095a-4472-9206-7e93b030ea3d	c7a89a0d-6c98-425f-a2ce-a76c1298bda6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c1998af7	10.00	2026-09-25 15:39:54.871-03	2026-09-25 15:39:54.92129-03
b7fc117c-4c54-4283-bebb-fe02d49384c1	c7a89a0d-6c98-425f-a2ce-a76c1298bda6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	5c02da21-8385-41e7-9f76-990d313adeef	a8238112-f78c-4a80-95d3-4d18336f1318	17128659	4cdf948c199981f	10.00	2026-09-25 15:39:58.243-03	2026-09-25 15:39:58.289724-03
76786768-3a4d-4315-9a0d-2618aeb2ed10	c7a89a0d-6c98-425f-a2ce-a76c1298bda6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	5c02da21-8385-41e7-9f76-990d313adeef	a8238112-f78c-4a80-95d3-4d18336f1318	17128659	4cdf948c199a8fb	10.00	2026-09-25 15:40:02.56-03	2026-09-25 15:40:02.604624-03
21d155c0-e840-4508-aaa7-744f80fb4ec8	c7a89a0d-6c98-425f-a2ce-a76c1298bda6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c199b75a	10.00	2026-09-25 15:40:06.222-03	2026-09-25 15:40:06.26911-03
495c9688-bb2d-4fa7-8d4f-db0b9c56e41d	c7a89a0d-6c98-425f-a2ce-a76c1298bda6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	fc46b33d-f0fd-4ec2-8533-47026eccf79a	3218d5b4-372e-424e-9d91-dedea2b741f3	D79D7859	4cdf948c199dfba	10.00	2026-09-25 15:40:16.561-03	2026-09-25 15:40:16.604364-03
b7171ff4-226e-4869-84b9-f8fa8f680f84	c7a89a0d-6c98-425f-a2ce-a76c1298bda6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	749fc814-f8ec-4587-b1fb-4df04cf71a75	a8238112-f78c-4a80-95d3-4d18336f1318	4CF30272	4cdf948c199f424	10.00	2026-09-25 15:40:21.781-03	2026-09-25 15:40:21.826089-03
c5e29382-3ed7-4eca-a21f-df69546205b2	c7a89a0d-6c98-425f-a2ce-a76c1298bda6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	749fc814-f8ec-4587-b1fb-4df04cf71a75	a8238112-f78c-4a80-95d3-4d18336f1318	4CF30272	4cdf948c19a081a	10.00	2026-09-25 15:40:26.905-03	2026-09-25 15:40:26.960904-03
7a86ed74-81a0-41ae-b8f7-5afc1f4718c8	e3c791bf-f725-4ff3-a28f-223be5fda429	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	749fc814-f8ec-4587-b1fb-4df04cf71a75	a8238112-f78c-4a80-95d3-4d18336f1318	4CF30272	4cdf948c1a72cc4	10.00	2026-09-25 15:54:48.276-03	2026-09-25 15:54:48.311913-03
37fb3684-c562-46f0-b874-b787f591ae53	e3c791bf-f725-4ff3-a28f-223be5fda429	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	3	749fc814-f8ec-4587-b1fb-4df04cf71a75	a8238112-f78c-4a80-95d3-4d18336f1318	4CF30272	4cdf948c1a75111	10.00	2026-09-25 15:54:57.546-03	2026-09-25 15:54:57.58316-03
f3f65dd0-4b02-45dd-85d0-f95baf8c172c	49521227-c098-4e6b-b819-8d0976a8a74a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	4	c9a7d7a2-56b3-4ba5-801a-aacee92fd45a	3218d5b4-372e-424e-9d91-dedea2b741f3	C7DD6359	4cdf948c2087	10.00	2026-09-29 16:27:02.65-03	2026-09-29 16:27:02.713915-03
c5c002ee-7d16-4290-a7a3-7a326bbe696d	7c21fbbb-5f23-4e04-9d4c-3475225c6a19	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	10	d70cac9b-1fb5-4444-a350-a6fadc61c300	3e781f1a-bd88-426c-b2de-d47f2489cc65	0455525ABB2190	4ddf948c5fea9	10.00	2026-10-05 13:50:34.192-03	2026-10-05 13:50:34.281614-03
47cfd991-3ddf-4c47-92dd-7b59d83688c2	7c21fbbb-5f23-4e04-9d4c-3475225c6a19	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	15	d70cac9b-1fb5-4444-a350-a6fadc61c300	3e781f1a-bd88-426c-b2de-d47f2489cc65	0455525ABB2190	2ca4b7019d54	10.00	2026-10-05 13:50:38.654-03	2026-10-05 13:50:38.707176-03
4fc81744-dd5a-460a-ad84-3b329971fe08	7c21fbbb-5f23-4e04-9d4c-3475225c6a19	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	12	d70cac9b-1fb5-4444-a350-a6fadc61c300	3e781f1a-bd88-426c-b2de-d47f2489cc65	0455525ABB2190	d1abc31c5ea38	10.00	2026-10-05 13:50:44.881-03	2026-10-05 13:50:44.931739-03
ba24fa3f-eb87-4752-b499-757eb83ed30a	7c21fbbb-5f23-4e04-9d4c-3475225c6a19	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	14	d70cac9b-1fb5-4444-a350-a6fadc61c300	3e781f1a-bd88-426c-b2de-d47f2489cc65	0455525ABB2190	89a99b205773c	10.00	2026-10-05 13:50:54.404-03	2026-10-05 13:50:54.468017-03
f9de49a8-dd95-4c42-845a-bdc410ad657a	7c21fbbb-5f23-4e04-9d4c-3475225c6a19	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	15	b3ee6536-ebd0-431d-b106-4ebde945cc9b	697df292-ec0f-40e5-97d5-1c77c6e539ff	04F0B45ABB2190	2ca4b7021016	10.00	2026-10-05 13:51:08.015-03	2026-10-05 13:51:08.068868-03
a7d7d4f2-fa53-4221-a6bc-00fe6b4bc23c	7c21fbbb-5f23-4e04-9d4c-3475225c6a19	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	10	b3ee6536-ebd0-431d-b106-4ebde945cc9b	697df292-ec0f-40e5-97d5-1c77c6e539ff	04F0B45ABB2190	4ddf948c69483	10.00	2026-10-05 13:51:12.53-03	2026-10-05 13:51:12.598378-03
f312daac-4e4c-4af4-bf1f-bc0c1f2d3ea6	7c21fbbb-5f23-4e04-9d4c-3475225c6a19	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	12	b3ee6536-ebd0-431d-b106-4ebde945cc9b	697df292-ec0f-40e5-97d5-1c77c6e539ff	04F0B45ABB2190	d1abc31c673c9	10.00	2026-10-05 13:51:20.098-03	2026-10-05 13:51:20.148663-03
87103187-4cfa-4139-a208-4dcbd309cb39	7c21fbbb-5f23-4e04-9d4c-3475225c6a19	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	1	14	b3ee6536-ebd0-431d-b106-4ebde945cc9b	697df292-ec0f-40e5-97d5-1c77c6e539ff	04F0B45ABB2190	89a99b205f2cf	10.00	2026-10-05 13:51:26.044-03	2026-10-05 13:51:26.091023-03
\.


--
-- Data for Name: zonaConquistaPartidaIndividual; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."zonaConquistaPartidaIndividual" (id, empresa_id, evento_id, brincadeira_id, status, version, started_at, finished_at, created_at, updated_at) FROM stdin;
015dd93d-e7d5-46be-968e-0ff0455bc869	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 08:27:49.922-03	\N	2026-09-25 08:27:49.922-03	2026-09-25 08:27:49.922-03
edbf11bf-8497-4bc7-8296-1cb2b32a4818	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 08:29:12.786-03	\N	2026-09-25 08:29:12.786-03	2026-09-25 08:29:12.786-03
0e42ba7b-4446-431f-a3d3-8c694800720e	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 08:37:46.074-03	\N	2026-09-25 08:37:46.074-03	2026-09-25 08:37:46.074-03
1455f0d0-4687-4e33-aae8-38f6d4a5aba7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-22 13:45:21.408-03	\N	2026-09-22 13:45:21.408-03	2026-09-22 13:45:21.408-03
1792f5a2-40e1-4791-86f6-9a91f8b75320	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 08:21:20.432-03	\N	2026-09-25 08:21:20.432-03	2026-09-25 08:21:20.432-03
250d0651-2f3e-4668-a98c-0870a8fe8a77	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 08:33:40.568-03	\N	2026-09-25 08:33:40.568-03	2026-09-25 08:33:40.568-03
2e356c7a-e05f-444f-a716-77233db25642	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 08:49:04.692-03	\N	2026-09-25 08:49:04.692-03	2026-09-25 08:49:04.692-03
5bada1c9-7ce6-4988-a3fe-a8a706252d9d	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 08:53:17.476-03	\N	2026-09-25 08:53:17.476-03	2026-09-25 08:53:17.476-03
6aa22ffc-b34d-4dd9-af58-104a7722b8ec	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-22 14:06:03.088-03	\N	2026-09-22 14:06:03.088-03	2026-09-22 14:06:03.088-03
6ff30257-c1a6-4872-bc5a-3492eda1b1fe	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 08:45:07.898-03	\N	2026-09-25 08:45:07.898-03	2026-09-25 08:45:07.898-03
7d456a2f-0aa9-4cfe-aa7a-59220cc4c421	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 10:28:32.753-03	\N	2026-09-25 10:28:32.753-03	2026-09-25 10:28:32.753-03
92e51a53-999c-48f2-9ec9-852f0f6776a7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 10:14:30.87-03	\N	2026-09-25 10:14:30.87-03	2026-09-25 10:14:30.87-03
9fe74eeb-5ba3-418b-9938-68ddb41f156b	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-22 13:41:35.694-03	\N	2026-09-22 13:41:35.694-03	2026-09-22 13:41:35.694-03
adcbf7dd-3b68-434b-ab67-d0091615ddfd	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-22 14:05:32.779-03	\N	2026-09-22 14:05:32.779-03	2026-09-22 14:05:32.779-03
bd105d77-5407-4de7-9634-e4ac349d6ff8	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 10:25:00.758-03	\N	2026-09-25 10:25:00.758-03	2026-09-25 10:25:00.758-03
c57ba5ca-f7f6-4de0-ac41-78b702438290	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-22 13:52:49.743-03	\N	2026-09-22 13:52:49.743-03	2026-09-22 13:52:49.743-03
d01842a2-6aa3-4cff-a11f-77c904f83ba1	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-22 13:47:47.008-03	\N	2026-09-22 13:47:47.008-03	2026-09-22 13:47:47.008-03
dd60e35d-c5e5-4d34-83ab-76d1b7ca958b	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 08:27:20.441-03	\N	2026-09-25 08:27:20.441-03	2026-09-25 08:27:20.441-03
e3fe2b70-d59b-411f-83b1-10617346dfbe	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-22 13:43:31.949-03	\N	2026-09-22 13:43:31.949-03	2026-09-22 13:43:31.949-03
eccbabb7-c970-4b46-be98-2f2ade73529c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-22 13:49:43.054-03	\N	2026-09-22 13:49:43.054-03	2026-09-22 13:49:43.054-03
667d4441-6d35-46ba-9866-13dffc6f44ed	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 11:07:27.974-03	2026-09-25 14:18:38.734-03	2026-09-25 11:07:27.974-03	2026-09-25 11:07:27.974-03
09bc52f7-7651-4ac8-bcaa-107acfeb7a51	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 13:07:29.802-03	2026-09-25 14:18:38.734-03	2026-09-25 13:07:29.802-03	2026-09-25 13:07:29.802-03
c81bc7b4-38b2-44db-96a6-f49371a4553f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 13:56:22.487-03	2026-09-25 14:18:38.734-03	2026-09-25 13:56:22.487-03	2026-09-25 13:56:22.487-03
a1247ea9-7292-45cf-b981-5069f7369545	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 14:18:38.766-03	2026-09-25 14:18:44.511-03	2026-09-25 14:18:38.766-03	2026-09-25 14:18:38.766-03
606b966d-1b2b-44ad-aa5d-321494ea950f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 14:18:47.143-03	2026-09-25 14:19:10.972-03	2026-09-25 14:18:47.143-03	2026-09-25 14:18:47.143-03
c374d9aa-df58-4f8d-9f2d-cf6e56f06b6e	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 14:22:39.138-03	2026-09-25 14:23:00.206-03	2026-09-25 14:22:39.138-03	2026-09-25 14:22:39.138-03
ac47673c-843e-4f86-9342-b70d6e441c4f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 14:23:14.621-03	2026-09-25 14:23:53.734-03	2026-09-25 14:23:14.621-03	2026-09-25 14:23:14.621-03
ce91bfb9-968c-4939-a7b0-56176454dfc2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 14:23:56.384-03	2026-09-25 14:24:59.584-03	2026-09-25 14:23:56.384-03	2026-09-25 14:23:56.384-03
4539d949-c95b-4ab7-afbb-795355921d00	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 14:30:46.633-03	2026-09-25 14:31:22.406-03	2026-09-25 14:30:46.633-03	2026-09-25 14:30:46.633-03
d607d2bb-dc06-48b1-9f5d-db4e1901a87f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 14:37:32.41-03	2026-09-25 14:38:32.632-03	2026-09-25 14:37:32.41-03	2026-09-25 14:37:32.41-03
3cf5124d-404d-4960-9efd-87c5a58692de	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 14:43:28.644-03	2026-09-25 14:43:51.095-03	2026-09-25 14:43:28.644-03	2026-09-25 14:43:28.644-03
1775d536-a4cf-405d-97a2-845fa7fc5b20	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 14:58:47.015-03	2026-09-25 14:59:36.144-03	2026-09-25 14:58:47.015-03	2026-09-25 14:58:47.015-03
708806d7-1508-4610-afdf-3210651f62d3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 15:48:37.53-03	2026-09-25 15:52:10.042-03	2026-09-25 15:48:37.53-03	2026-09-25 15:48:37.53-03
b0526759-0063-4a4d-9c31-a9680c1da759	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-25 16:21:50.665-03	2026-09-25 16:22:06.711-03	2026-09-25 16:21:50.665-03	2026-09-25 16:21:50.665-03
f7c65394-83f9-4f3c-a1d0-a10969f3d475	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-09-29 16:27:21.592-03	2026-09-29 16:27:59.688-03	2026-09-29 16:27:21.592-03	2026-09-29 16:27:21.592-03
3fac69b6-378d-4ca4-9cd8-f2151f7d9759	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	0	2026-10-05 13:51:55.088-03	2026-10-05 13:52:33.401-03	2026-10-05 13:51:55.088-03	2026-10-05 13:51:55.088-03
\.


--
-- Data for Name: zonaConquistaPartidaTime; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."zonaConquistaPartidaTime" (id, empresa_id, evento_id, brincadeira_id, status, round_number, current_team_id, started_at, finished_at, created_at, updated_at) FROM stdin;
bcc88fd4-b2dd-4859-a0f4-2a4757eac905	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 08:53:44.578378-03	2026-09-25 08:54:33.896994-03	2026-09-25 08:53:44.578378-03	2026-09-25 08:53:44.578378-03
861ea013-2ec6-41db-9b85-a73c7b37d2dc	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 10:25:23.37258-03	2026-09-25 10:25:42.573143-03	2026-09-25 10:25:23.37258-03	2026-09-25 10:25:23.37258-03
2841bbc6-1586-45d0-a1cd-7d90527c4702	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 10:56:12.426913-03	2026-09-25 10:57:20.277694-03	2026-09-25 10:56:12.426913-03	2026-09-25 10:56:12.426913-03
d824b250-193d-459d-9c4b-7e974475cb7c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 15:07:52.615284-03	2026-09-25 15:08:01.866-03	2026-09-25 15:07:52.615284-03	2026-09-25 15:07:52.615284-03
2b39ec03-fe9c-466d-81f7-44b395d5c3d3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 15:17:17.50954-03	2026-09-25 15:19:30.54-03	2026-09-25 15:17:17.50954-03	2026-09-25 15:17:17.50954-03
718a6b2e-5402-40bd-9c9b-f3ca11da73a6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 15:54:35.286719-03	2026-09-25 15:54:37.898-03	2026-09-25 15:54:35.286719-03	2026-09-25 15:54:35.286719-03
49521227-c098-4e6b-b819-8d0976a8a74a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-29 16:26:55.609168-03	2026-09-29 16:27:18.181-03	2026-09-29 16:26:55.609168-03	2026-09-29 16:26:55.609168-03
3a7f8c54-c6ec-4880-a43a-fe9e468d5580	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	\N	2026-10-01 08:22:02.858688-03	2026-10-01 08:22:29.998-03	2026-10-01 08:22:02.858688-03	2026-10-01 08:22:02.858688-03
216917de-d21d-458f-b5c8-1b7abdbc53eb	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	\N	2026-10-01 08:59:29.782478-03	2026-10-01 08:59:44.344-03	2026-10-01 08:59:29.782478-03	2026-10-01 08:59:29.782478-03
d83298f0-bb19-44a5-8cd9-b9cd3bde2ee5	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	\N	2026-10-01 09:03:37.35762-03	2026-10-01 09:03:51.113-03	2026-10-01 09:03:37.35762-03	2026-10-01 09:03:37.35762-03
486f5062-5333-49f3-a563-0b574befe962	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	\N	2026-10-01 10:18:38.134795-03	2026-10-01 10:18:43.461-03	2026-10-01 10:18:38.134795-03	2026-10-01 10:18:38.134795-03
60dc6a3a-9832-424c-83c7-1a27028482ca	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	\N	2026-10-01 10:49:52.215174-03	2026-10-01 10:49:56.02-03	2026-10-01 10:49:52.215174-03	2026-10-01 10:49:52.215174-03
ba86f6ee-5f8b-4faf-804e-fcc90c75cd4c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 11:48:14.060387-03	2026-09-21 13:46:40.996281-03	2026-09-21 11:48:14.060387-03	2026-09-21 11:48:14.060387-03
77ba4b68-f98f-46b0-b5a6-b9e0ed219577	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 11:53:57.427454-03	2026-09-21 13:46:40.996281-03	2026-09-21 11:53:57.427454-03	2026-09-21 11:53:57.427454-03
2e58d671-8e9e-42cc-9518-c2b3e6a53c14	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 11:55:50.39495-03	2026-09-21 13:46:40.996281-03	2026-09-21 11:55:50.39495-03	2026-09-21 11:55:50.39495-03
39379ff2-7b6f-4b94-a558-47f436e5f203	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 12:00:17.503145-03	2026-09-21 13:46:40.996281-03	2026-09-21 12:00:17.503145-03	2026-09-21 12:00:17.503145-03
6a8531dc-96b3-43b0-8a06-25b3f72dbac9	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 12:02:52.839608-03	2026-09-21 13:46:40.996281-03	2026-09-21 12:02:52.839608-03	2026-09-21 12:02:52.839608-03
1db5c636-4858-4570-aab6-6994a47de234	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 12:04:53.955584-03	2026-09-21 13:46:40.996281-03	2026-09-21 12:04:53.955584-03	2026-09-21 12:04:53.955584-03
b262e36d-7fac-49dd-8636-69f46569d12a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 12:05:41.010548-03	2026-09-21 13:46:40.996281-03	2026-09-21 12:05:41.010548-03	2026-09-21 12:05:41.010548-03
e185ca61-b0b0-46bb-a969-59a9f4532a00	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 12:09:32.983382-03	2026-09-21 13:46:40.996281-03	2026-09-21 12:09:32.983382-03	2026-09-21 12:09:32.983382-03
f1578d58-23ad-47d5-9a96-b6592a2fe3bc	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 12:15:15.54832-03	2026-09-21 13:46:40.996281-03	2026-09-21 12:15:15.54832-03	2026-09-21 12:15:15.54832-03
e77f7567-936c-4307-9b44-18c9bb8a1ec7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	\N	2026-10-01 11:12:04.661755-03	2026-10-01 11:12:12.105-03	2026-10-01 11:12:04.661755-03	2026-10-01 11:12:04.661755-03
0517fc83-ca5e-42d7-81e3-8b5262934e48	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:56:16.095634-03	2026-09-21 13:57:28.814029-03	2026-09-21 13:56:16.095634-03	2026-09-21 13:56:16.095634-03
aa8127a0-d52c-4640-b476-ce591cdd3e70	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	aea6e59c-7626-4e57-964a-5bf49620b671	2026-10-01 14:53:20.866209-03	2026-10-01 14:55:05.772-03	2026-10-01 14:53:20.866209-03	2026-10-01 14:53:20.866209-03
d3020904-ba10-4fc6-8b46-bc3967d34a8d	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3e781f1a-bd88-426c-b2de-d47f2489cc65	2026-10-05 13:49:24.220869-03	2026-10-05 13:49:33.216-03	2026-10-05 13:49:24.220869-03	2026-10-05 13:49:24.220869-03
7c21fbbb-5f23-4e04-9d4c-3475225c6a19	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3e781f1a-bd88-426c-b2de-d47f2489cc65	2026-10-05 13:50:27.641573-03	2026-10-05 13:51:43.198-03	2026-10-05 13:50:27.641573-03	2026-10-05 13:50:27.641573-03
dceac1c5-b094-4c26-b810-e77ac017a317	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 12:18:31.375249-03	2026-09-21 13:46:40.996281-03	2026-09-21 12:18:31.375249-03	2026-09-21 12:18:31.375249-03
4115f7b7-c548-44a3-ba76-c25004e15971	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 12:28:13.215948-03	2026-09-21 13:46:40.996281-03	2026-09-21 12:28:13.215948-03	2026-09-21 12:28:13.215948-03
d88e705c-f666-446c-a574-a2ed9496d8ea	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:12:11.210046-03	2026-09-21 13:46:40.996281-03	2026-09-21 13:12:11.210046-03	2026-09-21 13:12:11.210046-03
5af3f927-8175-45b9-9367-c9b5260b0385	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:13:39.228042-03	2026-09-21 13:46:40.996281-03	2026-09-21 13:13:39.228042-03	2026-09-21 13:13:39.228042-03
79f6ff35-e569-41fe-a1cd-48457591390b	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:15:36.166217-03	2026-09-21 13:46:40.996281-03	2026-09-21 13:15:36.166217-03	2026-09-21 13:15:36.166217-03
b2a9f481-908b-4025-a3b8-7a1ecc6e705e	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:16:45.458646-03	2026-09-21 13:46:40.996281-03	2026-09-21 13:16:45.458646-03	2026-09-21 13:16:45.458646-03
82ba226e-c091-4056-b219-3b60ac892566	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:18:26.93706-03	2026-09-21 13:46:40.996281-03	2026-09-21 13:18:26.93706-03	2026-09-21 13:18:26.93706-03
6b945f1d-071f-4f64-bf16-e0977d7590a4	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:21:29.304477-03	2026-09-21 13:46:40.996281-03	2026-09-21 13:21:29.304477-03	2026-09-21 13:21:29.304477-03
4df60e2e-0516-4b1c-a021-81688b47b1e5	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:24:37.077889-03	2026-09-21 13:46:40.996281-03	2026-09-21 13:24:37.077889-03	2026-09-21 13:24:37.077889-03
d6b0692d-5618-4bc9-ba4b-e0e5fd71bda2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:32:06.811422-03	2026-09-21 13:46:40.996281-03	2026-09-21 13:32:06.811422-03	2026-09-21 13:32:06.811422-03
3f303e74-137f-47c5-8817-90329e23dcb5	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:35:01.590384-03	2026-09-21 13:46:40.996281-03	2026-09-21 13:35:01.590384-03	2026-09-21 13:35:01.590384-03
70bbc3e7-af2e-4f57-abb7-6135550c65f2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:41:37.487077-03	2026-09-21 13:46:40.996281-03	2026-09-21 13:41:37.487077-03	2026-09-21 13:41:37.487077-03
b96f8e10-6fe6-4bf0-bd9c-790407acd8d8	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:45:52.464197-03	2026-09-21 13:46:40.996281-03	2026-09-21 13:45:52.464197-03	2026-09-21 13:45:52.464197-03
ba600358-dedf-4783-af3b-22e2bca13345	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:46:59.000172-03	2026-09-21 13:47:34.793955-03	2026-09-21 13:46:59.000172-03	2026-09-21 13:46:59.000172-03
4d4cfc63-6e4c-4928-94da-4794c92eedfe	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:50:19.66471-03	2026-09-21 13:50:42.747953-03	2026-09-21 13:50:19.66471-03	2026-09-21 13:50:19.66471-03
127eb500-552f-4740-86ba-219ac4a8a77a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 13:58:42.293566-03	2026-09-21 13:59:09.255039-03	2026-09-21 13:58:42.293566-03	2026-09-21 13:58:42.293566-03
0e1e2706-fd99-4a39-b51b-c472605221aa	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 14:03:47.214623-03	2026-09-21 14:04:12.653715-03	2026-09-21 14:03:47.214623-03	2026-09-21 14:03:47.214623-03
ed2aceb7-9062-43da-bbe1-b0ce1fb1b9a4	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 14:07:34.049528-03	2026-09-21 14:08:07.156206-03	2026-09-21 14:07:34.049528-03	2026-09-21 14:07:34.049528-03
3b14cc04-06e2-4300-9c87-09ea999cb8df	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 14:36:47.986179-03	2026-09-21 14:37:07.361005-03	2026-09-21 14:36:47.986179-03	2026-09-21 14:36:47.986179-03
0ff4fd01-c055-4ebb-ad55-230861a7f5f9	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 14:38:45.623215-03	2026-09-21 14:39:17.089386-03	2026-09-21 14:38:45.623215-03	2026-09-21 14:38:45.623215-03
72a0140d-79c9-472a-872a-cdaf48488a3f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 14:41:38.365784-03	2026-09-21 14:42:11.43076-03	2026-09-21 14:41:38.365784-03	2026-09-21 14:41:38.365784-03
ad09c2d4-0393-445f-8a0b-83cbd846a885	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 14:43:49.303799-03	2026-09-21 14:45:02.166864-03	2026-09-21 14:43:49.303799-03	2026-09-21 14:43:49.303799-03
1414fe31-9054-46f8-8409-71ae40689913	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 14:45:12.929077-03	2026-09-21 14:46:26.316767-03	2026-09-21 14:45:12.929077-03	2026-09-21 14:45:12.929077-03
bd427d72-ef77-40cb-98a6-de06ed9ad59d	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 14:46:35.016495-03	2026-09-21 14:47:35.463927-03	2026-09-21 14:46:35.016495-03	2026-09-21 14:46:35.016495-03
4e90904a-c6fc-4c1e-88ec-c14740312b3b	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 14:54:32.191695-03	2026-09-21 15:01:32.200757-03	2026-09-21 14:54:32.191695-03	2026-09-21 14:54:32.191695-03
9c249ca4-0d82-4943-a596-cbcc9ad9bba4	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 15:01:40.987689-03	2026-09-21 15:03:51.597443-03	2026-09-21 15:01:40.987689-03	2026-09-21 15:01:40.987689-03
e1dd591f-8dd5-4d78-a3a7-a9211ea60257	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 15:11:04.011818-03	2026-09-21 15:11:40.71949-03	2026-09-21 15:11:04.011818-03	2026-09-21 15:11:04.011818-03
a9b7b584-b53f-4daf-82b0-2e27d6f29186	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 15:11:51.518831-03	2026-09-21 15:13:51.543442-03	2026-09-21 15:11:51.518831-03	2026-09-21 15:11:51.518831-03
92166e8e-312a-4daa-93dd-2de923194aff	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 15:17:03.339272-03	2026-09-21 15:18:13.835696-03	2026-09-21 15:17:03.339272-03	2026-09-21 15:17:03.339272-03
d7c0aefc-b372-4940-b6f0-3ca5f0567e70	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 15:26:08.191152-03	2026-09-21 15:27:01.703109-03	2026-09-21 15:26:08.191152-03	2026-09-21 15:26:08.191152-03
0918a1b1-25ac-40ac-bb84-8c80f015f4b6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 10:14:13.06392-03	2026-09-25 10:14:27.312615-03	2026-09-25 10:14:13.06392-03	2026-09-25 10:14:13.06392-03
549f9e45-f4c3-4a48-a912-53ed2a5a13c4	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-21 15:31:56.120879-03	2026-09-22 08:15:09.059565-03	2026-09-21 15:31:56.120879-03	2026-09-21 15:31:56.120879-03
5e72a237-18b0-4755-a51a-15017adf189c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 08:14:19.359552-03	2026-09-22 08:15:09.059565-03	2026-09-22 08:14:19.359552-03	2026-09-22 08:14:19.359552-03
a8e37425-5b60-4b9d-be92-720c1d083aae	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 10:45:48.117695-03	2026-09-25 10:50:34.960883-03	2026-09-25 10:45:48.117695-03	2026-09-25 10:45:48.117695-03
cbfec570-a760-42e8-b913-6688d55655fc	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 08:20:57.869615-03	2026-09-22 08:22:02.33004-03	2026-09-22 08:20:57.869615-03	2026-09-22 08:20:57.869615-03
2b6dc512-a630-468d-9bd4-5ad086931084	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 11:06:34.936494-03	2026-09-25 11:07:22.933673-03	2026-09-25 11:06:34.936494-03	2026-09-25 11:06:34.936494-03
2cdb4abd-3050-4ce3-97c8-96a3f834edbd	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:29:51.298162-03	2026-09-22 11:30:46.220181-03	2026-09-22 11:29:51.298162-03	2026-09-22 11:29:51.298162-03
42e4bd2d-679e-4e74-b07f-8c5b7f53d527	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:32:36.1904-03	2026-09-22 11:33:21.146281-03	2026-09-22 11:32:36.1904-03	2026-09-22 11:32:36.1904-03
4ec542f8-a98e-4d6f-a22f-ad8e02492811	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 15:08:04.656917-03	2026-09-25 15:08:27.674-03	2026-09-25 15:08:04.656917-03	2026-09-25 15:08:12.474-03
67d3edfb-1580-4575-a6fe-c2cb684d7ebb	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:36:01.207157-03	2026-09-22 11:36:29.638566-03	2026-09-22 11:36:01.207157-03	2026-09-22 11:36:01.207157-03
c7a89a0d-6c98-425f-a2ce-a76c1298bda6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 15:39:49.114138-03	2026-09-25 15:40:31.635-03	2026-09-25 15:39:49.114138-03	2026-09-25 15:39:49.114138-03
a6fe972b-85d0-4f78-9941-840a6bc87cf5	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:38:43.004932-03	2026-09-22 11:39:11.559118-03	2026-09-22 11:38:43.004932-03	2026-09-22 11:38:43.004932-03
f2806b3f-f9eb-4fd1-a1cf-69f7fda3ab9c	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:39:13.984326-03	2026-09-22 11:39:27.6635-03	2026-09-22 11:39:13.984326-03	2026-09-22 11:39:13.984326-03
dc3271ef-b186-43fe-837c-3939b802c36f	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:39:30.792539-03	2026-09-22 11:40:14.59742-03	2026-09-22 11:39:30.792539-03	2026-09-22 11:39:30.792539-03
e3c791bf-f725-4ff3-a28f-223be5fda429	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-25 15:54:40.739124-03	2026-09-25 15:55:52.207-03	2026-09-25 15:54:40.739124-03	2026-09-25 15:54:40.739124-03
a164ea54-0091-42c8-80a5-554ffe5f2e41	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:42:19.743-03	2026-09-22 11:43:52.688625-03	2026-09-22 11:42:19.743-03	2026-09-22 11:42:19.743-03
b475df40-b829-4a2d-aad0-2bd8f0a263ff	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:43:56.707723-03	2026-09-22 11:44:09.349032-03	2026-09-22 11:43:56.707723-03	2026-09-22 11:43:56.707723-03
31644d89-b32b-4ed4-8620-b32c6b46fa90	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	\N	2026-09-30 18:05:49.402914-03	2026-09-30 18:06:02.672-03	2026-09-30 18:05:49.402914-03	2026-09-30 18:05:49.402914-03
12a6a4ed-7a4c-4e67-942f-b406feadeffb	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:44:11.950234-03	2026-09-22 11:44:28.109656-03	2026-09-22 11:44:11.950234-03	2026-09-22 11:44:11.950234-03
313717f0-47f8-4012-80ce-80d5dabe2af3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:46:12.752485-03	2026-09-22 11:46:48.738095-03	2026-09-22 11:46:12.752485-03	2026-09-22 11:46:12.752485-03
228c0a06-8455-4ab3-bd28-d0a6c1c53649	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:48:28.032114-03	2026-09-22 11:48:35.226117-03	2026-09-22 11:48:28.032114-03	2026-09-22 11:48:28.032114-03
3d888b76-9d76-45c0-822e-d24c56b0993e	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:48:48.143015-03	2026-09-22 11:49:45.95926-03	2026-09-22 11:48:48.143015-03	2026-09-22 11:48:48.143015-03
d487e00a-5ac2-42cd-ac8a-4f6354dee36e	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:51:26.13385-03	2026-09-22 11:53:45.054662-03	2026-09-22 11:51:26.13385-03	2026-09-22 11:51:26.13385-03
706d444f-f542-4d54-8e2d-79c5e8956222	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:58:38.38907-03	2026-09-22 11:59:24.211666-03	2026-09-22 11:58:38.38907-03	2026-09-22 11:58:38.38907-03
bbb463ac-3116-4921-99f9-d36e774b8169	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 11:59:54.80371-03	2026-09-22 11:59:59.51258-03	2026-09-22 11:59:54.80371-03	2026-09-22 11:59:54.80371-03
fcbfcdc8-dbfd-4a6b-b53f-bb34adb7a0c7	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 12:04:23.08273-03	2026-09-22 12:05:01.121639-03	2026-09-22 12:04:23.08273-03	2026-09-22 12:04:23.08273-03
a90f8754-2632-41ab-a583-f0d2514056f2	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a456cd5f-cfc3-4e93-96c2-4232578f9ea2	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 12:05:03.337331-03	2026-09-22 12:06:02.702162-03	2026-09-22 12:05:03.337331-03	2026-09-22 12:05:03.337331-03
d84c3270-08e1-4ab7-9b21-1d049ceba5d6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	6da6e7f8-0358-41e4-8dcd-253df10242bf	finished	1	3218d5b4-372e-424e-9d91-dedea2b741f3	2026-09-22 12:08:41.085646-03	2026-09-22 12:08:58.010471-03	2026-09-22 12:08:41.085646-03	2026-09-22 12:08:41.085646-03
\.


--
-- Data for Name: zonaConquistaProtecaoCheckpointIndividual; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."zonaConquistaProtecaoCheckpointIndividual" (id, partida_id, checkpoint_id, crianca_id, protection_until, created_at) FROM stdin;
\.


--
-- Data for Name: zonaConquistaTempoTime; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."zonaConquistaTempoTime" (id, partida_id, empresa_id, evento_id, time_id, status, zones_dominated, checkpoints_read, total_points, started_at, completed_at, elapsed_ms, created_at, updated_at) FROM stdin;
671a834a-f7bb-46e7-8713-f57d72199170	2b39ec03-fe9c-466d-81f7-44b395d5c3d3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	3218d5b4-372e-424e-9d91-dedea2b741f3	finished	0	0	0.00	2026-09-25 15:17:17.518552-03	2026-09-25 15:19:30.54-03	\N	2026-09-25 15:17:17.518552-03	2026-09-25 15:17:17.518552-03
0eabd660-c0cf-494e-8361-edf9515f976a	2b39ec03-fe9c-466d-81f7-44b395d5c3d3	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a8238112-f78c-4a80-95d3-4d18336f1318	finished	0	0	0.00	2026-09-25 15:17:17.526299-03	2026-09-25 15:19:30.54-03	\N	2026-09-25 15:17:17.526299-03	2026-09-25 15:17:17.526299-03
2277c6b7-7fe8-4df0-9469-35259b8b995c	49521227-c098-4e6b-b819-8d0976a8a74a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	3218d5b4-372e-424e-9d91-dedea2b741f3	finished	0	1	10.00	2026-09-29 16:26:55.61861-03	2026-09-29 16:27:18.181-03	\N	2026-09-29 16:26:55.61861-03	2026-09-29 16:27:02.65-03
c2b4a0d0-d586-4400-ac73-eca382e593a0	49521227-c098-4e6b-b819-8d0976a8a74a	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a8238112-f78c-4a80-95d3-4d18336f1318	finished	0	0	0.00	2026-09-29 16:26:55.627343-03	2026-09-29 16:27:18.181-03	\N	2026-09-29 16:26:55.627343-03	2026-09-29 16:26:55.627343-03
2c4d2e35-8479-43b3-9828-cdcb117ea303	aa8127a0-d52c-4640-b476-ce591cdd3e70	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	aea6e59c-7626-4e57-964a-5bf49620b671	finished	0	0	0.00	2026-10-01 14:53:20.872806-03	2026-10-01 14:55:05.772-03	\N	2026-10-01 14:53:20.872806-03	2026-10-01 14:53:20.872806-03
09b52c04-8301-48f8-b2f5-08bc1c706c06	aa8127a0-d52c-4640-b476-ce591cdd3e70	c9287e4b-399d-4764-8bff-2e0ce7058dcb	4695594c-19e9-493f-86a9-dfe79941400e	e4feef99-4920-4c40-b3c2-1c3a31c62f08	finished	0	0	0.00	2026-10-01 14:53:20.880855-03	2026-10-01 14:55:05.772-03	\N	2026-10-01 14:53:20.880855-03	2026-10-01 14:53:20.880855-03
8cc1c02d-782a-43da-9574-0656550913f4	c7a89a0d-6c98-425f-a2ce-a76c1298bda6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	3218d5b4-372e-424e-9d91-dedea2b741f3	finished	0	3	30.00	2026-09-25 15:39:49.121734-03	2026-09-25 15:40:31.635-03	\N	2026-09-25 15:39:49.121734-03	2026-09-25 15:40:16.561-03
58773065-ce1c-43b7-8daa-c6c01bff1bb4	c7a89a0d-6c98-425f-a2ce-a76c1298bda6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a8238112-f78c-4a80-95d3-4d18336f1318	finished	0	4	40.00	2026-09-25 15:39:49.125738-03	2026-09-25 15:40:31.635-03	\N	2026-09-25 15:39:49.125738-03	2026-09-25 15:40:26.905-03
bc9b627d-6cac-49a2-bec3-162ea68ce443	718a6b2e-5402-40bd-9c9b-f3ca11da73a6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	3218d5b4-372e-424e-9d91-dedea2b741f3	finished	0	0	0.00	2026-09-25 15:54:35.293067-03	2026-09-25 15:54:37.898-03	\N	2026-09-25 15:54:35.293067-03	2026-09-25 15:54:35.293067-03
32e1e4a7-5de5-48c5-ad59-1d0b045c09c1	718a6b2e-5402-40bd-9c9b-f3ca11da73a6	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a8238112-f78c-4a80-95d3-4d18336f1318	finished	0	0	0.00	2026-09-25 15:54:35.297732-03	2026-09-25 15:54:37.898-03	\N	2026-09-25 15:54:35.297732-03	2026-09-25 15:54:35.297732-03
16fcff94-26f5-430e-8ba9-c01066fd4a2c	d3020904-ba10-4fc6-8b46-bc3967d34a8d	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	3e781f1a-bd88-426c-b2de-d47f2489cc65	finished	0	0	0.00	2026-10-05 13:49:24.358298-03	2026-10-05 13:49:33.216-03	\N	2026-10-05 13:49:24.358298-03	2026-10-05 13:49:24.358298-03
3f871130-7dfb-495d-8c1c-056611eda9f9	e3c791bf-f725-4ff3-a28f-223be5fda429	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	3218d5b4-372e-424e-9d91-dedea2b741f3	finished	0	0	0.00	2026-09-25 15:54:40.742511-03	2026-09-25 15:55:52.207-03	\N	2026-09-25 15:54:40.742511-03	2026-09-25 15:54:40.742511-03
04bde8de-d5f0-46a4-930a-5d0917ce543f	e3c791bf-f725-4ff3-a28f-223be5fda429	c9287e4b-399d-4764-8bff-2e0ce7058dcb	9ba04dda-8cd4-4d44-a37b-3042a0b8519a	a8238112-f78c-4a80-95d3-4d18336f1318	finished	0	2	20.00	2026-09-25 15:54:40.747331-03	2026-09-25 15:55:52.207-03	\N	2026-09-25 15:54:40.747331-03	2026-09-25 15:54:57.546-03
1adbf4f5-eaff-4aef-a2ce-178a65efb53f	d3020904-ba10-4fc6-8b46-bc3967d34a8d	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	697df292-ec0f-40e5-97d5-1c77c6e539ff	finished	0	0	0.00	2026-10-05 13:49:24.535725-03	2026-10-05 13:49:33.216-03	\N	2026-10-05 13:49:24.535725-03	2026-10-05 13:49:24.535725-03
c3f83e81-5b8b-4d57-894d-90b0b1a443ab	7c21fbbb-5f23-4e04-9d4c-3475225c6a19	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	3e781f1a-bd88-426c-b2de-d47f2489cc65	finished	0	4	40.00	2026-10-05 13:50:27.778652-03	2026-10-05 13:51:43.198-03	\N	2026-10-05 13:50:27.778652-03	2026-10-05 13:50:54.404-03
980eaebc-4606-4856-bc49-8986a75ca473	7c21fbbb-5f23-4e04-9d4c-3475225c6a19	c9287e4b-399d-4764-8bff-2e0ce7058dcb	c920334b-c141-47ea-a791-dd2c9828be58	697df292-ec0f-40e5-97d5-1c77c6e539ff	finished	0	4	40.00	2026-10-05 13:50:27.912406-03	2026-10-05 13:51:43.198-03	\N	2026-10-05 13:50:27.912406-03	2026-10-05 13:51:26.044-03
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-07-24 14:06:47
20211116045059	2026-07-24 14:06:47
20211116050929	2026-07-24 14:06:47
20211116051442	2026-07-24 14:06:47
20211116212300	2026-07-24 14:06:47
20211116213355	2026-07-24 14:06:47
20211116213934	2026-07-24 14:06:47
20211116214523	2026-07-24 14:06:47
20211122062447	2026-07-24 14:06:47
20211124070109	2026-07-24 14:06:47
20211202204204	2026-07-24 14:06:47
20211202204605	2026-07-24 14:06:47
20211210212804	2026-07-24 14:06:47
20211228014915	2026-07-24 14:06:47
20220107221237	2026-07-24 14:06:47
20220228202821	2026-07-24 14:06:47
20220312004840	2026-07-24 14:06:47
20220603231003	2026-07-24 14:06:47
20220603232444	2026-07-24 14:06:47
20220615214548	2026-07-24 14:06:47
20220712093339	2026-07-24 14:06:47
20220908172859	2026-07-24 14:06:47
20220916233421	2026-07-24 14:06:47
20230119133233	2026-07-24 14:06:47
20230128025114	2026-07-24 14:06:47
20230128025212	2026-07-24 14:06:47
20230227211149	2026-07-24 14:06:47
20230228184745	2026-07-24 14:06:47
20230308225145	2026-07-24 14:06:47
20230328144023	2026-07-24 14:06:47
20231018144023	2026-07-24 14:06:47
20231204144023	2026-07-24 14:06:47
20231204144024	2026-07-24 14:06:47
20231204144025	2026-07-24 14:06:47
20240108234812	2026-07-24 14:06:47
20240109165339	2026-07-24 14:06:47
20240227174441	2026-07-24 14:06:47
20240311171622	2026-07-24 14:06:47
20240321100241	2026-07-24 14:06:47
20240401105812	2026-07-24 14:06:47
20240418121054	2026-07-24 14:06:47
20240523004032	2026-07-24 14:06:47
20240618124746	2026-07-24 14:06:47
20240801235015	2026-07-24 14:06:47
20240805133720	2026-07-24 14:06:47
20240827160934	2026-07-24 14:06:47
20240919163303	2026-07-24 14:06:47
20240919163305	2026-07-24 14:06:47
20241019105805	2026-07-24 14:06:47
20241030150047	2026-07-24 14:06:47
20241108114728	2026-07-24 14:06:47
20241121104152	2026-07-24 14:06:47
20241130184212	2026-07-24 14:06:47
20241220035512	2026-07-24 14:06:47
20241220123912	2026-07-24 14:06:47
20241224161212	2026-07-24 14:06:47
20250107150512	2026-07-24 14:06:47
20250110162412	2026-07-24 14:06:47
20250123174212	2026-07-24 14:06:47
20250128220012	2026-07-24 14:06:47
20250506224012	2026-07-24 14:06:47
20250523164012	2026-07-24 14:06:47
20250714121412	2026-07-24 14:06:47
20250905041441	2026-07-24 14:06:47
20251103001201	2026-07-24 14:06:47
20251120212548	2026-07-24 14:06:47
20251120215549	2026-07-24 14:06:47
20260218120000	2026-07-24 14:06:47
20260326120000	2026-07-24 14:06:47
20260514120000	2026-07-24 14:06:47
20260527120000	2026-07-24 14:06:47
20260528120000	2026-07-24 14:06:47
20260603120000	2026-07-24 14:06:47
20260605120000	2026-07-24 14:06:47
20260606110000	2026-07-24 14:06:47
20260616120000	2026-07-24 14:06:47
20260624120000	2026-07-24 14:06:47
20260626120000	2026-07-24 14:06:47
20260706120000	2026-07-24 14:06:47
20260707120000	2026-07-24 14:06:47
20260709120000	2026-07-24 14:06:47
20260714120000	2026-09-14 10:54:33
20260827120000	2026-09-16 20:18:31
20260914120000	2026-09-22 12:45:12
20260916120000	2026-09-22 12:45:12
20260922120000	2026-09-29 12:09:09
20260925120000	2026-10-05 12:00:51
20260928120000	2026-10-05 12:00:51
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter, selected_columns) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type, versioning_status, lifecycle_configuration, lifecycle_configuration_generation) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-07-24 14:06:50.723071
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-07-24 14:06:50.730741
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-07-24 14:06:50.736715
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-07-24 14:06:50.749153
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-07-24 14:06:50.76248
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-07-24 14:06:50.766985
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-07-24 14:06:50.772151
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-07-24 14:06:50.776992
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-07-24 14:06:50.78145
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-07-24 14:06:50.786273
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-07-24 14:06:50.790946
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-07-24 14:06:50.79679
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-07-24 14:06:50.80226
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-07-24 14:06:50.807196
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-07-24 14:06:50.812181
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-07-24 14:06:50.834375
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-07-24 14:06:50.839602
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-07-24 14:06:50.844087
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-07-24 14:06:50.848647
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-07-24 14:06:50.854775
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-07-24 14:06:50.859532
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-07-24 14:06:50.866495
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-07-24 14:06:50.88012
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-07-24 14:06:50.890237
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-07-24 14:06:50.895787
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-07-24 14:06:50.900838
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-07-24 14:06:50.905838
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-07-24 14:06:50.911786
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-07-24 14:06:50.916242
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-07-24 14:06:50.920689
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-07-24 14:06:50.925041
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-07-24 14:06:50.929349
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-07-24 14:06:50.933718
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-07-24 14:06:50.938718
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-07-24 14:06:50.942933
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-07-24 14:06:50.947192
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-07-24 14:06:50.951574
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-07-24 14:06:50.955809
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-07-24 14:06:50.960988
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-07-24 14:06:50.969178
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-07-24 14:06:50.973461
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-07-24 14:06:50.977841
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-07-24 14:06:50.982175
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-07-24 14:06:50.986745
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-07-24 14:06:50.990997
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-07-24 14:06:50.99612
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-07-24 14:06:51.009629
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-07-24 14:06:51.014833
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-07-24 14:06:51.019372
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-07-24 14:06:51.034468
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-07-24 14:06:51.039587
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-07-24 14:06:51.395892
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-07-24 14:06:51.398207
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-07-24 14:06:51.409429
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-07-24 14:06:51.412124
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-07-24 14:06:51.41368
56	fix-optimized-search-function	b823ed1e418101032fa01374edc9a436e54e3ed4	2026-07-24 14:06:51.419103
57	s3-multipart-uploads-metadata	f127886e00d1b374fadbc7c6b31e09336aad5287	2026-07-24 14:06:51.425002
58	operation-ergonomics	00ca5d483b3fe0d522133d9002ccc5df98365120	2026-07-24 14:06:51.42964
59	drop-unused-functions	38456f13e39691c2bbb4b5151d0d1cdbabd4a8c4	2026-07-24 14:06:51.435064
60	optimize-existing-functions-again	db35e1c91a9201e59f4fef8d972c2f277d68b157	2026-07-24 14:06:51.43999
61	mark-filename-immutable	fe0096517ae9d60aaec1d110172ba9036dc66bb7	2026-08-11 13:09:57.895334
62	object-versioning-core	0b855f00ff3be0bfca91efee02a9858912491a9a	2026-09-14 10:54:33.558246
63	fix-search-name-relative-to-prefix	c7485e417624f795ce8bb2da21927f48e088904d	2026-09-14 10:54:33.579534
64	fix-search-by-timestamp-sqli	0af424ecd388a39bb1645184b222185a12149675	2026-09-14 10:54:33.588704
66	objects-current-version-index	191466c93aa2c46a00e36505577c5fcab8d7cb4b	2026-09-14 10:54:34.348066
67	objects-null-version-index	15bfe8c35b66642b6c78ba60060fa8793bd2207a	2026-09-14 10:54:34.354772
65	objects-key-version-index	da319c4b89ba800ce795d1b699f3a70675138058	2026-09-14 10:54:34.33944
68	bucket-lifecycle-configuration	3c08f6f889922f399519722a932b51007c11bebc	2026-09-16 20:18:32.461459
69	validate-bucket-lifecycle-constraints	4febacaaaa0e61e2b783bef081fe03a287e65eb3	2026-09-16 20:18:32.895714
70	list-objects-with-versions	5c17c3777616cd8d7b18b82835525fa3205af57b	2026-09-16 20:18:32.904257
71	objects-delete-marker-index	6d14858e66c66f8d6accf8a2630aefd1527fddba	2026-09-16 20:18:33.575768
72	drop-bucketid-objname-index	302beb09e1b469d7d4db19566f2389d280b64aa3	2026-09-16 20:18:33.59081
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata, archived_at, is_delete_marker, is_versioned) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata, metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 1, false);


--
-- Name: checkpoint_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.checkpoint_tags_id_seq', 1, false);


--
-- Name: logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.logs_id_seq', 1, false);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.settings_id_seq', 17, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: mfa_recovery_code_sets mfa_recovery_code_sets_mfa_factor_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_code_sets
    ADD CONSTRAINT mfa_recovery_code_sets_mfa_factor_id_key UNIQUE (mfa_factor_id);


--
-- Name: mfa_recovery_code_sets mfa_recovery_code_sets_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_code_sets
    ADD CONSTRAINT mfa_recovery_code_sets_pkey PRIMARY KEY (id);


--
-- Name: mfa_recovery_code_sets mfa_recovery_code_sets_user_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_code_sets
    ADD CONSTRAINT mfa_recovery_code_sets_user_id_key UNIQUE (user_id);


--
-- Name: mfa_recovery_codes mfa_recovery_codes_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_codes
    ADD CONSTRAINT mfa_recovery_codes_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: scim_tokens scim_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.scim_tokens
    ADD CONSTRAINT scim_tokens_pkey PRIMARY KEY (id);


--
-- Name: scim_users scim_users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.scim_users
    ADD CONSTRAINT scim_users_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: logins UQ__logins__AB6E61641C935B6A; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logins
    ADD CONSTRAINT "UQ__logins__AB6E61641C935B6A" UNIQUE (email);


--
-- Name: cacaTesourScan UQ_caca_tesouro_scan_crianca; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."cacaTesourScan"
    ADD CONSTRAINT "UQ_caca_tesouro_scan_crianca" UNIQUE ("partidaId", "numeroRonda", "criancaId");


--
-- Name: etiquetaCheckpoint UQ_checkpoint_tag; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."etiquetaCheckpoint"
    ADD CONSTRAINT "UQ_checkpoint_tag" UNIQUE ("checkpointId", "tagUid");


--
-- Name: brincadeira brincadeiras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brincadeira
    ADD CONSTRAINT brincadeiras_pkey PRIMARY KEY ("brincadeiraId");


--
-- Name: cacaTesourPartida caca_tesouro_partidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."cacaTesourPartida"
    ADD CONSTRAINT caca_tesouro_partidas_pkey PRIMARY KEY ("partidaId");


--
-- Name: cacaTesourScan caca_tesouro_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."cacaTesourScan"
    ADD CONSTRAINT caca_tesouro_scans_pkey PRIMARY KEY ("scanId");


--
-- Name: etiquetaCheckpoint checkpoint_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."etiquetaCheckpoint"
    ADD CONSTRAINT checkpoint_tags_pkey PRIMARY KEY ("tagId");


--
-- Name: pontoVerificacao checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pontoVerificacao"
    ADD CONSTRAINT checkpoints_pkey PRIMARY KEY ("checkpointId");


--
-- Name: cliente clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT clientes_pkey PRIMARY KEY ("clienteId");


--
-- Name: conquista conquistas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conquista
    ADD CONSTRAINT conquistas_pkey PRIMARY KEY ("conquistaId");


--
-- Name: criancaConquista crianca_conquistas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."criancaConquista"
    ADD CONSTRAINT crianca_conquistas_pkey PRIMARY KEY ("criancaId", "conquistaId");


--
-- Name: crianca criancas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crianca
    ADD CONSTRAINT criancas_pkey PRIMARY KEY ("criancaId");


--
-- Name: crianca criancas_qr_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crianca
    ADD CONSTRAINT criancas_qr_code_key UNIQUE (qr_code);


--
-- Name: empresa empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT empresas_pkey PRIMARY KEY ("empresaId");


--
-- Name: eventoBrincadeira evento_brincadeiras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."eventoBrincadeira"
    ADD CONSTRAINT evento_brincadeiras_pkey PRIMARY KEY ("eventoId", "brincadeiraId");


--
-- Name: evento eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento
    ADD CONSTRAINT eventos_pkey PRIMARY KEY ("eventoId");


--
-- Name: vinculoFamiliar family_child_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."vinculoFamiliar"
    ADD CONSTRAINT family_child_links_pkey PRIMARY KEY ("vinculoId");


--
-- Name: conviteFamilia family_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."conviteFamilia"
    ADD CONSTRAINT family_invites_pkey PRIMARY KEY ("conviteId");


--
-- Name: codigoVinculoFamiliar family_linking_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."codigoVinculoFamiliar"
    ADD CONSTRAINT family_linking_codes_pkey PRIMARY KEY (id);


--
-- Name: codigoVinculoFamiliar family_linking_codes_qr_code_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."codigoVinculoFamiliar"
    ADD CONSTRAINT family_linking_codes_qr_code_value_key UNIQUE (qr_code_value);


--
-- Name: sessoesJogo game_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."sessoesJogo"
    ADD CONSTRAINT game_sessions_pkey PRIMARY KEY (id);


--
-- Name: leitura leituras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leitura
    ADD CONSTRAINT leituras_pkey PRIMARY KEY ("leituraId");


--
-- Name: logins logins_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logins
    ADD CONSTRAINT logins_email_key UNIQUE (email);


--
-- Name: logins logins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logins
    ADD CONSTRAINT logins_pkey PRIMARY KEY ("loginId");


--
-- Name: log logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log
    ADD CONSTRAINT logs_pkey PRIMARY KEY ("logId");


--
-- Name: mensagemDisplay mensagens_display_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."mensagemDisplay"
    ADD CONSTRAINT mensagens_display_pkey PRIMARY KEY ("mensagemId");


--
-- Name: monsterCacaPartida monster_hunt_partidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."monsterCacaPartida"
    ADD CONSTRAINT monster_hunt_partidas_pkey PRIMARY KEY (id);


--
-- Name: monsterCacaLeitura monster_hunt_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."monsterCacaLeitura"
    ADD CONSTRAINT monster_hunt_scans_pkey PRIMARY KEY (id);


--
-- Name: pontuacao pontuacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao
    ADD CONSTRAINT pontuacoes_pkey PRIMARY KEY ("pontuacaoId");


--
-- Name: pulseira pulseiras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulseira
    ADD CONSTRAINT pulseiras_pkey PRIMARY KEY (codigo);


--
-- Name: configuracao settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracao
    ADD CONSTRAINT settings_pkey PRIMARY KEY ("settingId");


--
-- Name: chamadoSuport support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."chamadoSuport"
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY ("ticketId");


--
-- Name: time times_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."time"
    ADD CONSTRAINT times_pkey PRIMARY KEY ("timeId");


--
-- Name: cacaTesourScan uq_caca_tesouro_scan_crianca; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."cacaTesourScan"
    ADD CONSTRAINT uq_caca_tesouro_scan_crianca UNIQUE ("partidaId", "numeroRonda", "criancaId");


--
-- Name: etiquetaCheckpoint uq_checkpoint_tag; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."etiquetaCheckpoint"
    ADD CONSTRAINT uq_checkpoint_tag UNIQUE ("checkpointId", "tagUid");


--
-- Name: zona zonas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona
    ADD CONSTRAINT zonas_pkey PRIMARY KEY ("zonaId");


--
-- Name: zonaConquistaProtecaoCheckpointIndividual zone_conquest_individual_checkpoint_protection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."zonaConquistaProtecaoCheckpointIndividual"
    ADD CONSTRAINT zone_conquest_individual_checkpoint_protection_pkey PRIMARY KEY (id);


--
-- Name: zonaConquistaPartidaIndividual zone_conquest_individual_partidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."zonaConquistaPartidaIndividual"
    ADD CONSTRAINT zone_conquest_individual_partidas_pkey PRIMARY KEY (id);


--
-- Name: zonaConquistaLeituraIndividual zone_conquest_individual_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."zonaConquistaLeituraIndividual"
    ADD CONSTRAINT zone_conquest_individual_scans_pkey PRIMARY KEY (id);


--
-- Name: zonaConquistaPartidaTime zone_conquest_team_partidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."zonaConquistaPartidaTime"
    ADD CONSTRAINT zone_conquest_team_partidas_pkey PRIMARY KEY (id);


--
-- Name: zonaConquistaLeituraTime zone_conquest_team_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."zonaConquistaLeituraTime"
    ADD CONSTRAINT zone_conquest_team_scans_pkey PRIMARY KEY (id);


--
-- Name: zonaConquistaTempoTime zone_conquest_team_tempos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."zonaConquistaTempoTime"
    ADD CONSTRAINT zone_conquest_team_tempos_pkey PRIMARY KEY (id);


--
-- Name: messages messages_payload_exclusive; Type: CHECK CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages
    ADD CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID;


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: mfa_recovery_codes_set_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_recovery_codes_set_id_idx ON auth.mfa_recovery_codes USING btree (mfa_recovery_code_set_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: scim_tokens_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_tokens_expires_at_idx ON auth.scim_tokens USING btree (expires_at);


--
-- Name: scim_tokens_revoked_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_tokens_revoked_at_idx ON auth.scim_tokens USING btree (revoked_at);


--
-- Name: scim_tokens_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_tokens_sso_provider_id_idx ON auth.scim_tokens USING btree (sso_provider_id);


--
-- Name: scim_tokens_token_hash_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX scim_tokens_token_hash_key ON auth.scim_tokens USING btree (token_hash);


--
-- Name: scim_users_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_created_at_idx ON auth.scim_users USING btree (sso_provider_id, created_at, id) WHERE (deleted_at IS NULL);


--
-- Name: scim_users_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_deleted_at_idx ON auth.scim_users USING btree (deleted_at);


--
-- Name: scim_users_external_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX scim_users_external_id_key ON auth.scim_users USING btree (sso_provider_id, external_id) WHERE ((external_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: scim_users_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_id_idx ON auth.scim_users USING btree (sso_provider_id, id) WHERE (deleted_at IS NULL);


--
-- Name: scim_users_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_sso_provider_id_idx ON auth.scim_users USING btree (sso_provider_id);


--
-- Name: scim_users_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_updated_at_idx ON auth.scim_users USING btree (sso_provider_id, updated_at, id) WHERE (deleted_at IS NULL);


--
-- Name: scim_users_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_user_id_idx ON auth.scim_users USING btree (user_id);


--
-- Name: scim_users_user_name_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_user_name_idx ON auth.scim_users USING btree (sso_provider_id, user_name COLLATE "C", id) WHERE (deleted_at IS NULL);


--
-- Name: scim_users_user_name_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX scim_users_user_name_key ON auth.scim_users USING btree (sso_provider_id, user_name) WHERE (deleted_at IS NULL);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: idx_flc_crianca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flc_crianca ON public."codigoVinculoFamiliar" USING btree (crianca_id);


--
-- Name: idx_flc_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flc_empresa ON public."codigoVinculoFamiliar" USING btree (empresa_id);


--
-- Name: idx_flc_qr_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flc_qr_code ON public."codigoVinculoFamiliar" USING btree (qr_code_value);


--
-- Name: idx_flc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flc_status ON public."codigoVinculoFamiliar" USING btree (status);


--
-- Name: idx_game_sessions_brincadeira; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_sessions_brincadeira ON public."sessoesJogo" USING btree (brincadeira_id);


--
-- Name: idx_game_sessions_evento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_sessions_evento ON public."sessoesJogo" USING btree (evento_id);


--
-- Name: idx_game_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_sessions_status ON public."sessoesJogo" USING btree (status);


--
-- Name: idx_leituras_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leituras_session_id ON public.leitura USING btree (session_id);


--
-- Name: idx_monster_hunt_partidas_evento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monster_hunt_partidas_evento ON public."monsterCacaPartida" USING btree (empresa_id, evento_id, status);


--
-- Name: idx_monster_hunt_scans_checkpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monster_hunt_scans_checkpoint ON public."monsterCacaLeitura" USING btree (partida_id, checkpoint_id, scanned_at);


--
-- Name: idx_monster_hunt_scans_evento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monster_hunt_scans_evento ON public."monsterCacaLeitura" USING btree (empresa_id, evento_id, partida_id);


--
-- Name: idx_zcip_evento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zcip_evento ON public."zonaConquistaPartidaIndividual" USING btree (evento_id);


--
-- Name: idx_zcip_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zcip_status ON public."zonaConquistaPartidaIndividual" USING btree (status);


--
-- Name: idx_zcis_crianca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zcis_crianca ON public."zonaConquistaLeituraIndividual" USING btree (crianca_id);


--
-- Name: idx_zcis_leitura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zcis_leitura ON public."zonaConquistaLeituraIndividual" USING btree (leitura_id);


--
-- Name: idx_zcis_partida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zcis_partida ON public."zonaConquistaLeituraIndividual" USING btree (partida_id);


--
-- Name: idx_zone_individual_partidas_evento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zone_individual_partidas_evento ON public."zonaConquistaPartidaIndividual" USING btree (evento_id, status);


--
-- Name: idx_zone_individual_protection_checkpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zone_individual_protection_checkpoint ON public."zonaConquistaProtecaoCheckpointIndividual" USING btree (checkpoint_id, protection_until);


--
-- Name: idx_zone_individual_scans_partida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zone_individual_scans_partida ON public."zonaConquistaLeituraIndividual" USING btree (partida_id, crianca_id);


--
-- Name: idx_zone_team_partidas_evento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zone_team_partidas_evento ON public."zonaConquistaPartidaTime" USING btree (evento_id, status);


--
-- Name: idx_zone_team_scans_partida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zone_team_scans_partida ON public."zonaConquistaLeituraTime" USING btree (partida_id, round_number);


--
-- Name: idx_zone_team_tempos_partida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zone_team_tempos_partida ON public."zonaConquistaTempoTime" USING btree (partida_id, time_id);


--
-- Name: uqFamilyChildLink; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "uqFamilyChildLink" ON public."vinculoFamiliar" USING btree ("loginId", "criancaId");


--
-- Name: uqFamilyInvitesTokenHash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "uqFamilyInvitesTokenHash" ON public."conviteFamilia" USING btree ("hashToken");


--
-- Name: uq_clientes_empresa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_clientes_empresa_id ON public.cliente USING btree (empresa_id) WHERE (empresa_id IS NOT NULL);


--
-- Name: uq_monster_hunt_scan_reading; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_monster_hunt_scan_reading ON public."monsterCacaLeitura" USING btree (leitura_id) WHERE (leitura_id IS NOT NULL);


--
-- Name: uq_settings_empresa_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_settings_empresa_key ON public.configuracao USING btree (COALESCE(empresa_id, ''::text), setting_key);


--
-- Name: uq_zone_individual_scan_reading; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_zone_individual_scan_reading ON public."zonaConquistaLeituraIndividual" USING btree (leitura_id) WHERE (leitura_id IS NOT NULL);


--
-- Name: uq_zone_team_scan_reading; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_zone_team_scan_reading ON public."zonaConquistaLeituraTime" USING btree (leitura_id) WHERE (leitura_id IS NOT NULL);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_selec; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_selec ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter, COALESCE(selected_columns, '{}'::text[]));


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: idx_objects_current_version; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_objects_current_version ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE (archived_at IS NULL);


--
-- Name: idx_objects_delete_markers; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_delete_markers ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE is_delete_marker;


--
-- Name: idx_objects_null_version; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_objects_null_version ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE (NOT is_versioned);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_name_version_key; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX objects_bucket_id_name_version_key ON storage.objects USING btree (bucket_id, name COLLATE "C", version) NULLS NOT DISTINCT;


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_bucket_control_insert; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_bucket_control_insert BEFORE INSERT ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.protect_bucket_control_columns('service_role');


--
-- Name: buckets protect_bucket_control_update; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_bucket_control_update BEFORE UPDATE OF lifecycle_configuration, lifecycle_configuration_generation ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.protect_bucket_control_columns();


--
-- Name: buckets protect_bucket_control_update_role; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_bucket_control_update_role AFTER UPDATE OF lifecycle_configuration, lifecycle_configuration_generation ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_lifecycle_service_role('service_role');


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_recovery_code_sets mfa_recovery_code_sets_mfa_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_code_sets
    ADD CONSTRAINT mfa_recovery_code_sets_mfa_factor_id_fkey FOREIGN KEY (mfa_factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_recovery_code_sets mfa_recovery_code_sets_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_code_sets
    ADD CONSTRAINT mfa_recovery_code_sets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_recovery_codes mfa_recovery_codes_mfa_recovery_code_set_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_codes
    ADD CONSTRAINT mfa_recovery_codes_mfa_recovery_code_set_id_fkey FOREIGN KEY (mfa_recovery_code_set_id) REFERENCES auth.mfa_recovery_code_sets(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: scim_tokens scim_tokens_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.scim_tokens
    ADD CONSTRAINT scim_tokens_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: scim_users scim_users_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.scim_users
    ADD CONSTRAINT scim_users_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: scim_users scim_users_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.scim_users
    ADD CONSTRAINT scim_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: etiquetaCheckpoint FK__checkpoin__check__01142BA1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."etiquetaCheckpoint"
    ADD CONSTRAINT "FK__checkpoin__check__01142BA1" FOREIGN KEY ("checkpointId") REFERENCES public."pontoVerificacao"("checkpointId");


--
-- Name: pontoVerificacao FK__checkpoin__event__7B5B524B; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pontoVerificacao"
    ADD CONSTRAINT "FK__checkpoin__event__7B5B524B" FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: pontoVerificacao FK__checkpoin__owner_crianca; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pontoVerificacao"
    ADD CONSTRAINT "FK__checkpoin__owner_crianca" FOREIGN KEY ("territorioDonosCriancaId") REFERENCES public.crianca("criancaId");


--
-- Name: pontoVerificacao FK__checkpoin__terri__7C4F7684; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pontoVerificacao"
    ADD CONSTRAINT "FK__checkpoin__terri__7C4F7684" FOREIGN KEY ("territorioDonoTimeId") REFERENCES public."time"("timeId");


--
-- Name: criancaConquista FK__crianca_c__conqu__17F790F9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."criancaConquista"
    ADD CONSTRAINT "FK__crianca_c__conqu__17F790F9" FOREIGN KEY ("conquistaId") REFERENCES public.conquista("conquistaId");


--
-- Name: criancaConquista FK__crianca_c__crian__17036CC0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."criancaConquista"
    ADD CONSTRAINT "FK__crianca_c__crian__17036CC0" FOREIGN KEY ("criancaId") REFERENCES public.crianca("criancaId");


--
-- Name: crianca FK__criancas__evento__6E01572D; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crianca
    ADD CONSTRAINT "FK__criancas__evento__6E01572D" FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: crianca FK__criancas__time_i__6EF57B66; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crianca
    ADD CONSTRAINT "FK__criancas__time_i__6EF57B66" FOREIGN KEY ("timeId") REFERENCES public."time"("timeId");


--
-- Name: eventoBrincadeira FK__evento_br__brinc__619B8048; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."eventoBrincadeira"
    ADD CONSTRAINT "FK__evento_br__brinc__619B8048" FOREIGN KEY ("brincadeiraId") REFERENCES public.brincadeira("brincadeiraId");


--
-- Name: eventoBrincadeira FK__evento_br__event__60A75C0F; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."eventoBrincadeira"
    ADD CONSTRAINT "FK__evento_br__event__60A75C0F" FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: evento FK__eventos__cliente__5441852A; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento
    ADD CONSTRAINT "FK__eventos__cliente__5441852A" FOREIGN KEY ("clienteId") REFERENCES public.cliente("clienteId");


--
-- Name: leitura FK__leituras__checkp__06CD04F7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leitura
    ADD CONSTRAINT "FK__leituras__checkp__06CD04F7" FOREIGN KEY ("checkpointId") REFERENCES public."pontoVerificacao"("checkpointId");


--
-- Name: leitura FK__leituras__crianc__07C12930; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leitura
    ADD CONSTRAINT "FK__leituras__crianc__07C12930" FOREIGN KEY ("criancaId") REFERENCES public.crianca("criancaId");


--
-- Name: logins FK__logins__empresa___6BE40491; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logins
    ADD CONSTRAINT "FK__logins__empresa___6BE40491" FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: log FK__logs__cliente_id__208CD6FA; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log
    ADD CONSTRAINT "FK__logs__cliente_id__208CD6FA" FOREIGN KEY ("clienteId") REFERENCES public.cliente("clienteId");


--
-- Name: log FK__logs__evento_id__2180FB33; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log
    ADD CONSTRAINT "FK__logs__evento_id__2180FB33" FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: mensagemDisplay FK__mensagens__event__1CBC4616; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."mensagemDisplay"
    ADD CONSTRAINT "FK__mensagens__event__1CBC4616" FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: pontuacao FK__pontuacoe__check__0F624AF8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao
    ADD CONSTRAINT "FK__pontuacoe__check__0F624AF8" FOREIGN KEY ("checkpointId") REFERENCES public."pontoVerificacao"("checkpointId");


--
-- Name: pontuacao FK__pontuacoe__crian__0D7A0286; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao
    ADD CONSTRAINT "FK__pontuacoe__crian__0D7A0286" FOREIGN KEY ("criancaId") REFERENCES public.crianca("criancaId");


--
-- Name: pontuacao FK__pontuacoe__event__0C85DE4D; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao
    ADD CONSTRAINT "FK__pontuacoe__event__0C85DE4D" FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: pulseira FK__pulseiras__crian__73BA3083; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulseira
    ADD CONSTRAINT "FK__pulseiras__crian__73BA3083" FOREIGN KEY (crianca_id) REFERENCES public.crianca("criancaId");


--
-- Name: time FK__times__evento_id__66603565; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."time"
    ADD CONSTRAINT "FK__times__evento_id__66603565" FOREIGN KEY (evento_id) REFERENCES public.evento("eventoId");


--
-- Name: zona FK__zonas__evento_id__25518C17; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona
    ADD CONSTRAINT "FK__zonas__evento_id__25518C17" FOREIGN KEY (evento_id) REFERENCES public.evento("eventoId");


--
-- Name: brincadeira FK_brincadeiras_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brincadeira
    ADD CONSTRAINT "FK_brincadeiras_empresas" FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: pontoVerificacao FK_checkpoints_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pontoVerificacao"
    ADD CONSTRAINT "FK_checkpoints_empresas" FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: crianca FK_criancas_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crianca
    ADD CONSTRAINT "FK_criancas_empresas" FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: evento FK_eventos_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento
    ADD CONSTRAINT "FK_eventos_empresas" FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: leitura FK_leituras_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leitura
    ADD CONSTRAINT "FK_leituras_empresas" FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: pontuacao FK_pontuacoes_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao
    ADD CONSTRAINT "FK_pontuacoes_empresas" FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: pulseira FK_pulseiras_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulseira
    ADD CONSTRAINT "FK_pulseiras_empresas" FOREIGN KEY (empresa_id) REFERENCES public.empresa("empresaId");


--
-- Name: time FK_times_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."time"
    ADD CONSTRAINT "FK_times_empresas" FOREIGN KEY (empresa_id) REFERENCES public.empresa("empresaId");


--
-- Name: codigoVinculoFamiliar family_linking_codes_crianca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."codigoVinculoFamiliar"
    ADD CONSTRAINT family_linking_codes_crianca_id_fkey FOREIGN KEY (crianca_id) REFERENCES public.crianca("criancaId");


--
-- Name: codigoVinculoFamiliar family_linking_codes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."codigoVinculoFamiliar"
    ADD CONSTRAINT family_linking_codes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresa("empresaId");


--
-- Name: codigoVinculoFamiliar family_linking_codes_evento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."codigoVinculoFamiliar"
    ADD CONSTRAINT family_linking_codes_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.evento("eventoId");


--
-- Name: codigoVinculoFamiliar family_linking_codes_used_by_login_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."codigoVinculoFamiliar"
    ADD CONSTRAINT family_linking_codes_used_by_login_id_fkey FOREIGN KEY (used_by_login_id) REFERENCES public.logins("loginId");


--
-- Name: brincadeira fk_brincadeiras_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brincadeira
    ADD CONSTRAINT fk_brincadeiras_empresas FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: etiquetaCheckpoint fk_checkpoint_tags_checkpoint; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."etiquetaCheckpoint"
    ADD CONSTRAINT fk_checkpoint_tags_checkpoint FOREIGN KEY ("checkpointId") REFERENCES public."pontoVerificacao"("checkpointId");


--
-- Name: pontoVerificacao fk_checkpoints_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pontoVerificacao"
    ADD CONSTRAINT fk_checkpoints_empresas FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: pontoVerificacao fk_checkpoints_evento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pontoVerificacao"
    ADD CONSTRAINT fk_checkpoints_evento FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: pontoVerificacao fk_checkpoints_owner_crianca; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pontoVerificacao"
    ADD CONSTRAINT fk_checkpoints_owner_crianca FOREIGN KEY ("territorioDonosCriancaId") REFERENCES public.crianca("criancaId");


--
-- Name: pontoVerificacao fk_checkpoints_owner_time; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."pontoVerificacao"
    ADD CONSTRAINT fk_checkpoints_owner_time FOREIGN KEY ("territorioDonoTimeId") REFERENCES public."time"("timeId");


--
-- Name: criancaConquista fk_crianca_conquistas_conquista; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."criancaConquista"
    ADD CONSTRAINT fk_crianca_conquistas_conquista FOREIGN KEY ("conquistaId") REFERENCES public.conquista("conquistaId");


--
-- Name: criancaConquista fk_crianca_conquistas_crianca; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."criancaConquista"
    ADD CONSTRAINT fk_crianca_conquistas_crianca FOREIGN KEY ("criancaId") REFERENCES public.crianca("criancaId");


--
-- Name: crianca fk_criancas_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crianca
    ADD CONSTRAINT fk_criancas_empresas FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: crianca fk_criancas_evento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crianca
    ADD CONSTRAINT fk_criancas_evento FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: crianca fk_criancas_time; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crianca
    ADD CONSTRAINT fk_criancas_time FOREIGN KEY ("timeId") REFERENCES public."time"("timeId");


--
-- Name: eventoBrincadeira fk_evento_brincadeiras_brincadeira; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."eventoBrincadeira"
    ADD CONSTRAINT fk_evento_brincadeiras_brincadeira FOREIGN KEY ("brincadeiraId") REFERENCES public.brincadeira("brincadeiraId");


--
-- Name: eventoBrincadeira fk_evento_brincadeiras_evento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."eventoBrincadeira"
    ADD CONSTRAINT fk_evento_brincadeiras_evento FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: evento fk_eventos_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento
    ADD CONSTRAINT fk_eventos_cliente FOREIGN KEY ("clienteId") REFERENCES public.cliente("clienteId");


--
-- Name: evento fk_eventos_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento
    ADD CONSTRAINT fk_eventos_empresas FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: leitura fk_leituras_checkpoint; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leitura
    ADD CONSTRAINT fk_leituras_checkpoint FOREIGN KEY ("checkpointId") REFERENCES public."pontoVerificacao"("checkpointId");


--
-- Name: leitura fk_leituras_crianca; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leitura
    ADD CONSTRAINT fk_leituras_crianca FOREIGN KEY ("criancaId") REFERENCES public.crianca("criancaId");


--
-- Name: leitura fk_leituras_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leitura
    ADD CONSTRAINT fk_leituras_empresas FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: logins fk_logins_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logins
    ADD CONSTRAINT fk_logins_empresa FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: log fk_logs_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log
    ADD CONSTRAINT fk_logs_cliente FOREIGN KEY ("clienteId") REFERENCES public.cliente("clienteId");


--
-- Name: log fk_logs_evento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log
    ADD CONSTRAINT fk_logs_evento FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: mensagemDisplay fk_mensagens_display_evento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."mensagemDisplay"
    ADD CONSTRAINT fk_mensagens_display_evento FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: pontuacao fk_pontuacoes_checkpoint; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao
    ADD CONSTRAINT fk_pontuacoes_checkpoint FOREIGN KEY ("checkpointId") REFERENCES public."pontoVerificacao"("checkpointId");


--
-- Name: pontuacao fk_pontuacoes_crianca; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao
    ADD CONSTRAINT fk_pontuacoes_crianca FOREIGN KEY ("criancaId") REFERENCES public.crianca("criancaId");


--
-- Name: pontuacao fk_pontuacoes_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao
    ADD CONSTRAINT fk_pontuacoes_empresas FOREIGN KEY ("empresaId") REFERENCES public.empresa("empresaId");


--
-- Name: pontuacao fk_pontuacoes_evento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao
    ADD CONSTRAINT fk_pontuacoes_evento FOREIGN KEY ("eventoId") REFERENCES public.evento("eventoId");


--
-- Name: pulseira fk_pulseiras_crianca; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulseira
    ADD CONSTRAINT fk_pulseiras_crianca FOREIGN KEY (crianca_id) REFERENCES public.crianca("criancaId");


--
-- Name: pulseira fk_pulseiras_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulseira
    ADD CONSTRAINT fk_pulseiras_empresas FOREIGN KEY (empresa_id) REFERENCES public.empresa("empresaId");


--
-- Name: time fk_times_empresas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."time"
    ADD CONSTRAINT fk_times_empresas FOREIGN KEY (empresa_id) REFERENCES public.empresa("empresaId");


--
-- Name: time fk_times_evento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."time"
    ADD CONSTRAINT fk_times_evento FOREIGN KEY (evento_id) REFERENCES public.evento("eventoId");


--
-- Name: zona fk_zonas_evento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona
    ADD CONSTRAINT fk_zonas_evento FOREIGN KEY (evento_id) REFERENCES public.evento("eventoId");


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict AdIRxZYLrh8zeTzPRgUjl4geepbSy3hZKY6xduY7WLCenSxxrLZlNSQxJM7uOpk


