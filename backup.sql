--
-- PostgreSQL database dump
--

\restrict nmsa9TtPwrPyCGoPOandse1QWyo1p2AY09fGoixDNAYSImw7pjsQuagr0qh1xPC

-- Dumped from database version 16.11
-- Dumped by pg_dump version 18.4

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: batch_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.batch_status AS ENUM (
    'open',
    'closed',
    'live'
);


--
-- Name: item_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_category AS ENUM (
    'feed',
    'medicine',
    'chicks',
    'finished_birds'
);


--
-- Name: ledger_account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ledger_account_type AS ENUM (
    'asset',
    'liability',
    'equity',
    'revenue',
    'expense'
);


--
-- Name: ledger_entry_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ledger_entry_type AS ENUM (
    'debit',
    'payment'
);


--
-- Name: loan_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.loan_status AS ENUM (
    'active',
    'closed'
);


--
-- Name: movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.movement_type AS ENUM (
    'purchase',
    'allocation',
    'adjustment',
    'transfer'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'PENDING',
    'WEIGHT_ENTERED',
    'CONFIRMED',
    'CANCELLED_BY_TRADER',
    'REJECTED_BY_SUPERVISOR',
    'EXPIRED'
);


--
-- Name: other_expense_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.other_expense_category AS ENUM (
    'feed_transfer',
    'loading_unloading',
    'petrol',
    'employee_expenses',
    'misc',
    'feed_delivery',
    'medicine'
);


--
-- Name: payment_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_mode AS ENUM (
    'cash',
    'bank'
);


--
-- Name: payment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_type AS ENUM (
    'CASH',
    'PAYABLE',
    'RECEIVABLE'
);


--
-- Name: purchase_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.purchase_category AS ENUM (
    'bird',
    'feed',
    'medicine'
);


--
-- Name: requirement_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.requirement_category AS ENUM (
    'bird',
    'feed',
    'medicine'
);


--
-- Name: requirement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.requirement_status AS ENUM (
    'accept',
    'decline',
    'pending'
);


--
-- Name: supplier_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.supplier_type AS ENUM (
    'feed',
    'chick',
    'medicine'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'supervisor',
    'accountant',
    'trader'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_supervisors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_supervisors (
    id integer NOT NULL,
    google_sub character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(150) NOT NULL,
    phone character varying(15),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: app_supervisors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_supervisors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_supervisors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_supervisors_id_seq OWNED BY public.app_supervisors.id;


--
-- Name: app_traders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_traders (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(150) NOT NULL,
    phone character varying(15) NOT NULL,
    credit_limit numeric(18,2),
    credit_terms_days integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    password_hash character varying(255) NOT NULL,
    linked_trader_id integer
);


--
-- Name: app_traders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_traders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_traders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_traders_id_seq OWNED BY public.app_traders.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    audit_id integer NOT NULL,
    order_id integer NOT NULL,
    actor_type character varying(20) NOT NULL,
    actor_id integer NOT NULL,
    action character varying(100) NOT NULL,
    field_changed character varying(100),
    old_value text,
    new_value text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_log_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_audit_id_seq OWNED BY public.audit_log.audit_id;


--
-- Name: batch_allocation_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_allocation_lines (
    allocation_line_id integer NOT NULL,
    allocation_id integer NOT NULL,
    lot_id integer NOT NULL,
    qty numeric(12,2) NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    line_value numeric(12,2) NOT NULL,
    batch_id integer
);


--
-- Name: batch_allocation_lines_allocation_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_allocation_lines_allocation_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_allocation_lines_allocation_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_allocation_lines_allocation_line_id_seq OWNED BY public.batch_allocation_lines.allocation_line_id;


--
-- Name: batch_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_allocations (
    allocation_id integer NOT NULL,
    requirement_id integer NOT NULL,
    allocated_qty numeric(12,2) NOT NULL,
    allocated_value numeric(18,2) NOT NULL,
    allocation_date date NOT NULL,
    allocated_by integer NOT NULL
);


--
-- Name: batch_allocations_allocation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_allocations_allocation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_allocations_allocation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_allocations_allocation_id_seq OWNED BY public.batch_allocations.allocation_id;


--
-- Name: batch_closure_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_closure_summary (
    id integer NOT NULL,
    batch_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    initial_chicken_count integer NOT NULL,
    available_chicken_count integer NOT NULL,
    revenue numeric(12,2) DEFAULT 0 NOT NULL,
    gross_profit numeric(12,2) DEFAULT 0 NOT NULL
);


--
-- Name: batch_closure_summary_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_closure_summary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_closure_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_closure_summary_id_seq OWNED BY public.batch_closure_summary.id;


--
-- Name: batch_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_requirements (
    requirement_id integer NOT NULL,
    batch_id integer NOT NULL,
    line_id integer NOT NULL,
    supervisor_id integer NOT NULL,
    item_code character varying(100) NOT NULL,
    quantity numeric(12,2) NOT NULL,
    status public.requirement_status DEFAULT 'pending'::public.requirement_status NOT NULL,
    request_date date NOT NULL
);


--
-- Name: batch_requirements_requirement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_requirements_requirement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_requirements_requirement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_requirements_requirement_id_seq OWNED BY public.batch_requirements.requirement_id;


--
-- Name: batch_sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_sales (
    id integer NOT NULL,
    item_code character varying NOT NULL,
    batch_id integer NOT NULL,
    trader_id integer NOT NULL,
    avg_weight numeric NOT NULL,
    rate numeric NOT NULL,
    quantity numeric NOT NULL,
    value numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_type public.payment_type DEFAULT 'CASH'::public.payment_type NOT NULL,
    sale_date date DEFAULT '2026-01-01'::date NOT NULL,
    app_trader_id integer
);


--
-- Name: batch_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_sales_id_seq OWNED BY public.batch_sales.id;


--
-- Name: batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batches (
    batch_id integer NOT NULL,
    line_id integer NOT NULL,
    supervisor_id integer NOT NULL,
    farmer_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    initial_bird_count integer NOT NULL,
    current_bird_count integer NOT NULL,
    status public.batch_status DEFAULT 'open'::public.batch_status,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    avg_body_weight numeric(10,2),
    activated_at timestamp with time zone,
    closed_at timestamp with time zone,
    farm_id integer
);


--
-- Name: batches_batch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batches_batch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batches_batch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batches_batch_id_seq OWNED BY public.batches.batch_id;


--
-- Name: bird_count_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bird_count_history (
    record_id integer NOT NULL,
    batch_id integer NOT NULL,
    record_date date NOT NULL,
    deaths integer DEFAULT 0 NOT NULL,
    notes text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    additions integer DEFAULT 0 NOT NULL
);


--
-- Name: bird_count_history_record_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bird_count_history_record_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bird_count_history_record_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bird_count_history_record_id_seq OWNED BY public.bird_count_history.record_id;


--
-- Name: bird_sell_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bird_sell_history (
    sale_id integer NOT NULL,
    batch_id integer NOT NULL,
    trader_id integer NOT NULL,
    sale_date date NOT NULL,
    quantity_sold integer NOT NULL,
    price_per_bird numeric(12,2) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    notes text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: bird_sell_history_sale_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bird_sell_history_sale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bird_sell_history_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bird_sell_history_sale_id_seq OWNED BY public.bird_sell_history.sale_id;


--
-- Name: farmer_commission_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.farmer_commission_history (
    id integer NOT NULL,
    farmer_id integer NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    description character varying,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: farmer_commission_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.farmer_commission_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: farmer_commission_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.farmer_commission_history_id_seq OWNED BY public.farmer_commission_history.id;


--
-- Name: farmers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.farmers (
    farmer_id integer NOT NULL,
    name character varying(100) NOT NULL,
    phone_number character varying(15) NOT NULL,
    address text NOT NULL,
    bank_account_no character varying(30) NOT NULL,
    bank_name character varying(100) NOT NULL,
    ifsc_code character varying(15) NOT NULL,
    area_size numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: farmers_farmer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.farmers_farmer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: farmers_farmer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.farmers_farmer_id_seq OWNED BY public.farmers.farmer_id;


--
-- Name: farms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.farms (
    farm_id integer NOT NULL,
    farmer_id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    video_url text,
    gmaps_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    location text
);


--
-- Name: farms_farm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.farms_farm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: farms_farm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.farms_farm_id_seq OWNED BY public.farms.farm_id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    inventory_id integer NOT NULL,
    item_code character varying(100) NOT NULL,
    current_qty numeric(12,2) DEFAULT 0 NOT NULL,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_inventory_id_seq OWNED BY public.inventory.inventory_id;


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    movement_id integer NOT NULL,
    item_code character varying(100) NOT NULL,
    qty_change numeric(12,2) NOT NULL,
    movement_type public.movement_type NOT NULL,
    reference_id integer NOT NULL,
    movement_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: inventory_movements_movement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_movements_movement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_movements_movement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_movements_movement_id_seq OWNED BY public.inventory_movements.movement_id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    item_code character varying(100) NOT NULL,
    item_name character varying(100) NOT NULL,
    item_category public.item_category NOT NULL,
    unit character varying(50) NOT NULL
);


--
-- Name: ledger_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_accounts (
    account_id integer NOT NULL,
    name character varying(150) NOT NULL,
    account_type public.ledger_account_type NOT NULL,
    current_balance numeric(18,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ledger_accounts_account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ledger_accounts_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ledger_accounts_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ledger_accounts_account_id_seq OWNED BY public.ledger_accounts.account_id;


--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_entries (
    entry_id integer NOT NULL,
    account_id integer NOT NULL,
    debit numeric(18,2),
    credit numeric(18,2),
    txn_date date NOT NULL,
    reference_table character varying(100),
    reference_id integer,
    narration text,
    txn_group_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL
);


--
-- Name: ledger_entries_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ledger_entries_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ledger_entries_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ledger_entries_entry_id_seq OWNED BY public.ledger_entries.entry_id;


--
-- Name: loan_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_payments (
    payment_id integer NOT NULL,
    loan_id integer NOT NULL,
    principal_amount numeric(18,2) DEFAULT 0 NOT NULL,
    interest_amount numeric(18,2) DEFAULT 0 NOT NULL,
    total_amount numeric(18,2) NOT NULL,
    payment_date date NOT NULL,
    payment_mode character varying(50),
    reference_number character varying(100),
    txn_group_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer
);


--
-- Name: loan_payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.loan_payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: loan_payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.loan_payments_payment_id_seq OWNED BY public.loan_payments.payment_id;


--
-- Name: loans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loans (
    loan_id integer NOT NULL,
    lender_name character varying(100) NOT NULL,
    principal_amount numeric(18,2) NOT NULL,
    interest_rate numeric(5,2),
    loan_date date NOT NULL,
    due_date date,
    outstanding_balance numeric(18,2) DEFAULT 0 NOT NULL,
    status public.loan_status DEFAULT 'active'::public.loan_status NOT NULL,
    txn_group_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer
);


--
-- Name: loans_loan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.loans_loan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: loans_loan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.loans_loan_id_seq OWNED BY public.loans.loan_id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    order_id integer NOT NULL,
    inquiry_number character varying(30) NOT NULL,
    trader_id integer NOT NULL,
    batch_id integer NOT NULL,
    timeslot_id integer NOT NULL,
    requested_weight numeric(12,2) NOT NULL,
    status public.order_status DEFAULT 'PENDING'::public.order_status NOT NULL,
    actual_weight numeric(12,2),
    actual_birds integer,
    entry_rate numeric(12,2),
    total_amount numeric(18,2),
    rejection_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    weight_entered_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    rejected_at timestamp with time zone,
    expired_at timestamp with time zone
);


--
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_order_id_seq OWNED BY public.orders.order_id;


--
-- Name: other_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.other_expenses (
    id integer NOT NULL,
    category public.other_expense_category NOT NULL,
    amount numeric(18,2) NOT NULL,
    description text,
    expense_date date NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: other_expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.other_expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: other_expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.other_expenses_id_seq OWNED BY public.other_expenses.id;


--
-- Name: post; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post (
    id integer NOT NULL,
    title character varying NOT NULL,
    text character varying NOT NULL
);


--
-- Name: post_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.post_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: post_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.post_id_seq OWNED BY public.post.id;


--
-- Name: production_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_lines (
    line_id integer NOT NULL,
    line_name character varying(100) NOT NULL,
    supervisor_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: production_lines_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_lines_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_lines_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_lines_line_id_seq OWNED BY public.production_lines.line_id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    purchase_order_id integer NOT NULL,
    supplier_id integer NOT NULL,
    purchase_date date NOT NULL,
    payment_type public.payment_type,
    created_by integer NOT NULL,
    total_cost numeric(12,2) DEFAULT 0 NOT NULL
);


--
-- Name: purchase_orders_purchase_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_purchase_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_purchase_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_purchase_order_id_seq OWNED BY public.purchase_orders.purchase_order_id;


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    purchase_id integer NOT NULL,
    item_code character varying(100) NOT NULL,
    cost_per_unit numeric(12,2) NOT NULL,
    total_cost numeric(12,2) NOT NULL,
    quantity numeric(12,2) DEFAULT 0 NOT NULL,
    purchase_date date NOT NULL,
    created_by integer NOT NULL,
    payment_type public.payment_type,
    supplier_id integer NOT NULL,
    purchase_order_id integer
);


--
-- Name: purchases_purchase_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchases_purchase_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchases_purchase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchases_purchase_id_seq OWNED BY public.purchases.purchase_id;


--
-- Name: seaql_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seaql_migrations (
    version character varying NOT NULL,
    applied_at bigint NOT NULL
);


--
-- Name: stock_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_receipts (
    lot_id integer NOT NULL,
    purchase_id integer NOT NULL,
    item_code character varying(100) NOT NULL,
    received_qty numeric(12,2) NOT NULL,
    remaining_qty numeric(12,2) NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    received_date date NOT NULL,
    supplier character varying(100) NOT NULL
);


--
-- Name: stock_receipts_lot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_receipts_lot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_receipts_lot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_receipts_lot_id_seq OWNED BY public.stock_receipts.lot_id;


--
-- Name: stock_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_returns (
    return_id integer NOT NULL,
    allocation_line_id integer NOT NULL,
    batch_id integer NOT NULL,
    return_qty numeric(12,2) NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    return_value numeric(12,2) NOT NULL,
    return_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: stock_returns_return_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_returns_return_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_returns_return_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_returns_return_id_seq OWNED BY public.stock_returns.return_id;


--
-- Name: supplier_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_payments (
    payment_id integer NOT NULL,
    supplier_id integer NOT NULL,
    amount numeric(18,2) NOT NULL,
    payment_date date NOT NULL,
    payment_mode character varying(50),
    reference_number character varying(100),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    txn_group_id uuid
);


--
-- Name: supplier_payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.supplier_payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_payments_payment_id_seq OWNED BY public.supplier_payments.payment_id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    supplier_id integer NOT NULL,
    supplier_type public.supplier_type NOT NULL,
    name character varying(100) NOT NULL,
    phone_number character varying(15) NOT NULL,
    address text NOT NULL,
    bank_account_no character varying(30) NOT NULL,
    bank_name character varying(100) NOT NULL,
    ifsc_code character varying(15) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_supplier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_supplier_id_seq OWNED BY public.suppliers.supplier_id;


--
-- Name: timeslots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeslots (
    timeslot_id integer NOT NULL,
    batch_id integer NOT NULL,
    slot_start time without time zone NOT NULL,
    slot_end time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: timeslots_timeslot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timeslots_timeslot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timeslots_timeslot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timeslots_timeslot_id_seq OWNED BY public.timeslots.timeslot_id;


--
-- Name: trader_ledger_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trader_ledger_entries (
    id integer NOT NULL,
    trader_id integer NOT NULL,
    order_id integer,
    type public.ledger_entry_type NOT NULL,
    amount numeric(18,2) NOT NULL,
    payment_mode public.payment_mode,
    screenshot_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: trader_ledger_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trader_ledger_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trader_ledger_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trader_ledger_entries_id_seq OWNED BY public.trader_ledger_entries.id;


--
-- Name: trader_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trader_payments (
    payment_id integer NOT NULL,
    trader_id integer NOT NULL,
    amount numeric(18,2) NOT NULL,
    payment_date date NOT NULL,
    payment_mode character varying(50),
    reference_number character varying(100),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer,
    txn_group_id uuid
);


--
-- Name: trader_payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trader_payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trader_payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trader_payments_payment_id_seq OWNED BY public.trader_payments.payment_id;


--
-- Name: traders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.traders (
    trader_id integer NOT NULL,
    name character varying(100) NOT NULL,
    phone_number character varying(15) NOT NULL,
    address text NOT NULL,
    bank_account_no character varying(30) NOT NULL,
    bank_name character varying(100) NOT NULL,
    ifsc_code character varying(15) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: traders_trader_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.traders_trader_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: traders_trader_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.traders_trader_id_seq OWNED BY public.traders.trader_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    role public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    phone character varying(15)
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: app_supervisors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_supervisors ALTER COLUMN id SET DEFAULT nextval('public.app_supervisors_id_seq'::regclass);


--
-- Name: app_traders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_traders ALTER COLUMN id SET DEFAULT nextval('public.app_traders_id_seq'::regclass);


--
-- Name: audit_log audit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN audit_id SET DEFAULT nextval('public.audit_log_audit_id_seq'::regclass);


--
-- Name: batch_allocation_lines allocation_line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_allocation_lines ALTER COLUMN allocation_line_id SET DEFAULT nextval('public.batch_allocation_lines_allocation_line_id_seq'::regclass);


--
-- Name: batch_allocations allocation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_allocations ALTER COLUMN allocation_id SET DEFAULT nextval('public.batch_allocations_allocation_id_seq'::regclass);


--
-- Name: batch_closure_summary id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_closure_summary ALTER COLUMN id SET DEFAULT nextval('public.batch_closure_summary_id_seq'::regclass);


--
-- Name: batch_requirements requirement_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_requirements ALTER COLUMN requirement_id SET DEFAULT nextval('public.batch_requirements_requirement_id_seq'::regclass);


--
-- Name: batch_sales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_sales ALTER COLUMN id SET DEFAULT nextval('public.batch_sales_id_seq'::regclass);


--
-- Name: batches batch_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches ALTER COLUMN batch_id SET DEFAULT nextval('public.batches_batch_id_seq'::regclass);


--
-- Name: bird_count_history record_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bird_count_history ALTER COLUMN record_id SET DEFAULT nextval('public.bird_count_history_record_id_seq'::regclass);


--
-- Name: bird_sell_history sale_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bird_sell_history ALTER COLUMN sale_id SET DEFAULT nextval('public.bird_sell_history_sale_id_seq'::regclass);


--
-- Name: farmer_commission_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farmer_commission_history ALTER COLUMN id SET DEFAULT nextval('public.farmer_commission_history_id_seq'::regclass);


--
-- Name: farmers farmer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farmers ALTER COLUMN farmer_id SET DEFAULT nextval('public.farmers_farmer_id_seq'::regclass);


--
-- Name: farms farm_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farms ALTER COLUMN farm_id SET DEFAULT nextval('public.farms_farm_id_seq'::regclass);


--
-- Name: inventory inventory_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory ALTER COLUMN inventory_id SET DEFAULT nextval('public.inventory_inventory_id_seq'::regclass);


--
-- Name: inventory_movements movement_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements ALTER COLUMN movement_id SET DEFAULT nextval('public.inventory_movements_movement_id_seq'::regclass);


--
-- Name: ledger_accounts account_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_accounts ALTER COLUMN account_id SET DEFAULT nextval('public.ledger_accounts_account_id_seq'::regclass);


--
-- Name: ledger_entries entry_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries ALTER COLUMN entry_id SET DEFAULT nextval('public.ledger_entries_entry_id_seq'::regclass);


--
-- Name: loan_payments payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_payments ALTER COLUMN payment_id SET DEFAULT nextval('public.loan_payments_payment_id_seq'::regclass);


--
-- Name: loans loan_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans ALTER COLUMN loan_id SET DEFAULT nextval('public.loans_loan_id_seq'::regclass);


--
-- Name: orders order_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN order_id SET DEFAULT nextval('public.orders_order_id_seq'::regclass);


--
-- Name: other_expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.other_expenses ALTER COLUMN id SET DEFAULT nextval('public.other_expenses_id_seq'::regclass);


--
-- Name: post id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post ALTER COLUMN id SET DEFAULT nextval('public.post_id_seq'::regclass);


--
-- Name: production_lines line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lines ALTER COLUMN line_id SET DEFAULT nextval('public.production_lines_line_id_seq'::regclass);


--
-- Name: purchase_orders purchase_order_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN purchase_order_id SET DEFAULT nextval('public.purchase_orders_purchase_order_id_seq'::regclass);


--
-- Name: purchases purchase_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases ALTER COLUMN purchase_id SET DEFAULT nextval('public.purchases_purchase_id_seq'::regclass);


--
-- Name: stock_receipts lot_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipts ALTER COLUMN lot_id SET DEFAULT nextval('public.stock_receipts_lot_id_seq'::regclass);


--
-- Name: stock_returns return_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_returns ALTER COLUMN return_id SET DEFAULT nextval('public.stock_returns_return_id_seq'::regclass);


--
-- Name: supplier_payments payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments ALTER COLUMN payment_id SET DEFAULT nextval('public.supplier_payments_payment_id_seq'::regclass);


--
-- Name: suppliers supplier_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN supplier_id SET DEFAULT nextval('public.suppliers_supplier_id_seq'::regclass);


--
-- Name: timeslots timeslot_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeslots ALTER COLUMN timeslot_id SET DEFAULT nextval('public.timeslots_timeslot_id_seq'::regclass);


--
-- Name: trader_ledger_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trader_ledger_entries ALTER COLUMN id SET DEFAULT nextval('public.trader_ledger_entries_id_seq'::regclass);


--
-- Name: trader_payments payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trader_payments ALTER COLUMN payment_id SET DEFAULT nextval('public.trader_payments_payment_id_seq'::regclass);


--
-- Name: traders trader_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traders ALTER COLUMN trader_id SET DEFAULT nextval('public.traders_trader_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Data for Name: app_supervisors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_supervisors (id, google_sub, email, name, phone, created_at) FROM stdin;
\.


--
-- Data for Name: app_traders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_traders (id, email, name, phone, credit_limit, credit_terms_days, created_at, password_hash, linked_trader_id) FROM stdin;
2	trader@test.com	Test Trader	9876500001	50000.00	15	2026-08-03 20:37:34.9235+00	$2b$12$yRZHLL8GM/ek3Zh4YLnlBexh0uzdtDabpb7zKDMfwwjOrgwAW.Hdy	1
4	test@example.com	Test Trader	9111111111	\N	\N	2026-08-31 02:22:22.310973+00	$2b$12$PH76XREC6ONbdfD3eWA1DeZB1ICu38HCVkBGdLpEQtCsLRAIgTvf.	\N
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (audit_id, order_id, actor_type, actor_id, action, field_changed, old_value, new_value, created_at) FROM stdin;
2	3	trader	2	order_created	\N	\N	batch=33|timeslot=4	2026-08-03 20:39:54.193663+00
3	4	trader	2	order_created	\N	\N	batch=33|timeslot=5	2026-08-03 20:40:01.418541+00
4	3	trader	2	status_change	status	PENDING	CANCELLED_BY_TRADER	2026-08-03 20:40:22.177391+00
5	5	trader	2	order_created	\N	\N	batch=33|timeslot=4	2026-08-03 20:43:21.263385+00
6	4	supervisor	2	weight_entered	weight	\N	155	2026-08-03 22:44:27.462307+00
7	4	supervisor	2	birds_entered	birds	\N	62	2026-08-03 22:44:27.462307+00
8	4	supervisor	2	rate_set	entry_rate	\N	180	2026-08-03 22:44:38.086329+00
9	4	supervisor	2	order_closed	status	WEIGHT_ENTERED	CONFIRMED	2026-08-03 22:44:38.086329+00
10	7	supervisor	2	weight_entered	weight	\N	100	2026-08-03 22:45:10.035313+00
11	7	supervisor	2	birds_entered	birds	\N	40	2026-08-03 22:45:10.035313+00
12	7	supervisor	2	weight_cleared	weight	100.00	\N	2026-08-03 22:45:14.844898+00
13	7	supervisor	2	order_rejected	status	PENDING	REJECTED_BY_SUPERVISOR	2026-08-03 22:45:19.059991+00
14	8	supervisor	2	weight_entered	weight	\N	40	2026-08-06 11:42:40.270372+00
15	8	supervisor	2	birds_entered	birds	\N	10	2026-08-06 11:42:40.270372+00
16	8	supervisor	2	rate_set	entry_rate	\N	100	2026-08-06 11:45:29.445485+00
17	8	supervisor	2	order_closed	status	WEIGHT_ENTERED	CONFIRMED	2026-08-06 11:45:29.445485+00
18	9	trader	2	order_created	\N	\N	batch=33|timeslot=5	2026-08-06 11:48:39.902135+00
19	9	supervisor	2	weight_entered	weight	\N	150	2026-08-06 11:51:25.559063+00
20	9	supervisor	2	birds_entered	birds	\N	100	2026-08-06 11:51:25.559063+00
21	9	supervisor	2	rate_set	entry_rate	\N	200	2026-08-06 11:58:21.965805+00
22	9	supervisor	2	order_closed	status	WEIGHT_ENTERED	CONFIRMED	2026-08-06 11:58:21.965805+00
23	10	trader	2	order_created	\N	\N	batch=35|timeslot=7	2026-08-06 12:01:54.679975+00
24	10	supervisor	2	weight_entered	weight	\N	222	2026-08-06 12:03:46.64316+00
25	10	supervisor	2	birds_entered	birds	\N	100	2026-08-06 12:03:46.64316+00
26	11	trader	2	order_created	\N	\N	batch=33|timeslot=4	2026-08-16 18:28:19.558196+00
27	11	supervisor	2	order_rejected	status	PENDING	REJECTED_BY_SUPERVISOR	2026-08-18 07:05:05.063012+00
28	12	trader	2	order_created	\N	\N	batch=38|timeslot=8	2026-08-18 07:06:39.561746+00
29	12	supervisor	2	weight_entered	weight	\N	200	2026-08-18 07:07:52.122182+00
30	12	supervisor	2	birds_entered	birds	\N	100	2026-08-18 07:07:52.122182+00
31	12	supervisor	2	rate_set	entry_rate	\N	100	2026-08-18 07:10:07.48695+00
32	12	supervisor	2	order_closed	status	WEIGHT_ENTERED	CONFIRMED	2026-08-18 07:10:07.48695+00
33	13	trader	2	order_created	\N	\N	batch=38|timeslot=8	2026-08-18 09:44:11.487936+00
34	14	trader	2	order_created	\N	\N	batch=38|timeslot=8	2026-08-18 09:44:30.814912+00
35	13	supervisor	2	weight_entered	weight	\N	500	2026-08-18 09:46:06.660269+00
36	13	supervisor	2	birds_entered	birds	\N	250	2026-08-18 09:46:06.660269+00
37	10	supervisor	2	order_rejected	status	WEIGHT_ENTERED	REJECTED_BY_SUPERVISOR	2026-08-18 09:46:36.241422+00
38	13	supervisor	2	rate_set	entry_rate	\N	101	2026-08-18 09:46:53.200764+00
39	13	supervisor	2	order_closed	status	WEIGHT_ENTERED	CONFIRMED	2026-08-18 09:46:53.200764+00
40	14	supervisor	2	order_rejected	status	PENDING	REJECTED_BY_SUPERVISOR	2026-08-31 07:48:08.278142+00
41	15	trader	2	order_created	\N	\N	batch=40|timeslot=10	2026-09-04 11:16:49.115433+00
42	15	supervisor	2	weight_entered	weight	\N	200	2026-09-04 11:17:37.510762+00
43	15	supervisor	2	birds_entered	birds	\N	100	2026-09-04 11:17:37.510762+00
44	15	supervisor	2	rate_set	entry_rate	\N	100	2026-09-04 11:18:11.412152+00
45	15	supervisor	2	order_closed	status	WEIGHT_ENTERED	CONFIRMED	2026-09-04 11:18:11.412152+00
\.


--
-- Data for Name: batch_allocation_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.batch_allocation_lines (allocation_line_id, allocation_id, lot_id, qty, unit_cost, line_value, batch_id) FROM stdin;
1	1	1	1530.00	53.92	82497.60	1
2	2	2	2238.00	54.07	121008.66	2
3	3	3	3541.00	45.13	159805.33	3
4	4	4	2550.00	46.07	117478.50	4
5	5	5	2295.00	50.98	116999.10	5
6	6	6	3468.00	50.98	176798.64	6
7	7	7	1989.00	53.92	107246.88	7
8	8	9	20.00	1912.05	38241.00	5
9	9	9	30.00	1912.05	57361.50	6
10	10	8	40.00	1754.55	70182.00	7
11	11	9	10.00	1912.05	19120.50	1
12	12	9	17.00	1912.05	32504.85	2
13	12	10	3.00	1827.44	5482.32	2
14	13	8	60.00	1754.55	105273.00	2
15	13	11	40.00	1677.36	67094.40	2
16	14	10	18.00	1827.44	32893.92	7
17	15	11	80.00	1677.36	134188.80	7
18	16	10	35.00	1827.44	63960.40	3
19	17	11	55.00	1677.36	92254.80	3
20	18	10	22.00	1827.44	40203.68	4
21	19	11	30.00	1677.36	50320.80	4
22	20	13	2805.00	52.94	148496.70	8
23	21	10	20.00	1827.44	36548.80	8
24	22	14	21.00	1677.36	35224.56	2
25	23	17	12.00	1650.56	19806.72	2
26	24	10	8.00	1827.44	14619.52	8
27	25	14	32.00	1677.36	53675.52	8
28	26	14	67.00	1677.36	112383.12	6
29	26	11	2.00	1677.36	3354.72	6
30	27	12	29.00	1827.44	52995.76	5
31	27	16	2.00	1677.66	3355.32	5
32	27	19	30.00	1675.00	50250.00	5
33	27	21	1.00	1776.00	1776.00	5
34	28	21	74.00	1776.00	131424.00	4
35	29	21	104.00	1776.00	184704.00	1
36	30	10	5.00	1827.44	9137.20	1
37	31	21	1.00	1776.00	1776.00	7
38	32	29	10.00	160.00	1600.00	7
39	33	17	8.00	1650.56	13204.48	1
40	33	20	2.00	1595.00	3190.00	1
41	34	20	2.00	1595.00	3190.00	1
42	35	30	10.00	150.00	1500.00	1
43	36	33	1931.00	54.12	104505.72	9
44	37	10	12.00	1827.44	21929.28	9
45	38	37	3162.00	54.90	173593.80	10
46	39	10	9.00	1827.44	16446.96	10
47	39	15	21.00	1877.69	39431.49	10
48	40	38	2344.00	55.93	131099.92	11
49	41	55	1428.00	54.90	78397.20	12
50	42	15	10.00	1877.69	18776.90	12
51	43	20	26.00	1595.00	41470.00	4
52	43	31	27.00	1595.00	43065.00	4
53	44	18	179.00	42.78	7657.62	4
54	45	21	30.00	1776.00	53280.00	3
55	45	25	41.00	1677.36	68771.76	3
56	46	31	33.00	1595.00	52635.00	3
57	46	35	27.00	1650.56	44565.12	3
58	47	18	1.00	42.78	42.78	3
59	47	26	60.00	41.67	2500.20	3
60	47	27	155.00	75.00	11625.00	3
61	48	25	19.00	1677.36	31869.84	10
62	48	34	21.00	1677.36	35224.56	10
63	49	34	4.00	1677.36	6709.44	8
64	49	42	2.00	1677.36	3354.72	8
65	49	50	19.00	1804.80	34291.20	8
66	50	57	1922.00	55.36	106401.92	13
67	51	15	7.00	1877.69	13143.83	13
68	51	39	20.00	1877.69	37553.80	13
69	52	58	1422.00	55.13	78394.86	14
70	53	39	3.00	1877.69	5633.07	14
71	53	48	10.00	1904.49	19044.90	14
72	54	59	2025.00	55.06	111496.50	15
73	55	48	20.00	1904.49	38089.80	15
74	56	48	20.00	1904.49	38089.80	11
75	56	60	3.00	1904.49	5713.47	11
76	57	50	27.00	1804.80	48729.60	11
77	58	50	40.00	1804.80	72192.00	12
78	59	60	5.00	1904.49	9522.45	9
79	60	50	14.00	1804.80	25267.20	9
80	60	54	10.00	1704.16	17041.60	9
81	60	56	51.00	1704.17	86912.67	9
82	61	56	9.00	1704.17	15337.53	8
83	61	62	26.00	1704.17	44308.42	8
84	62	35	8.00	1650.56	13204.48	8
85	62	41	35.00	1650.56	57769.60	8
86	62	51	20.00	1782.40	35648.00	8
87	63	51	75.00	1782.40	133680.00	6
88	64	62	10.00	1704.17	17041.70	13
90	66	64	3718.00	56.69	210773.42	16
91	67	62	14.00	1704.17	23858.38	5
92	67	65	20.00	1804.80	36096.00	5
93	68	51	5.00	1782.40	8912.00	5
94	68	66	19.00	1782.40	33865.60	5
95	69	27	45.00	75.00	3375.00	5
96	69	28	60.00	42.50	2550.00	5
97	69	32	45.00	41.67	1875.15	5
98	70	47	10.00	280.00	2800.00	5
99	71	39	10.00	1877.69	18776.90	16
100	71	60	28.00	1904.49	53325.72	16
101	72	65	14.00	1804.80	25267.20	6
102	72	68	38.00	1704.17	64758.46	6
103	73	71	2244.00	50.98	114399.12	17
104	74	60	22.00	1904.49	41898.78	17
105	75	62	10.00	1704.17	17041.70	6
106	75	69	20.00	1704.00	34080.00	6
107	76	47	1.00	280.00	280.00	6
108	77	47	9.00	280.00	2520.00	6
109	77	67	191.00	10.00	1910.00	6
110	78	32	15.00	41.67	625.05	6
111	78	36	60.00	41.67	2500.20	6
112	78	45	25.00	41.67	1041.75	6
113	79	45	35.00	41.67	1458.45	6
114	79	46	15.00	18.33	274.95	6
115	80	67	50.00	10.00	500.00	6
116	81	67	4.00	10.00	40.00	6
117	82	69	28.00	1704.00	47712.00	8
118	83	46	45.00	18.33	824.85	8
119	83	52	60.00	50.00	3000.00	8
120	83	53	86.00	70.00	6020.00	8
121	84	79	10.00	295.00	2950.00	8
122	85	60	2.00	1904.49	3808.98	9
123	85	76	20.00	1971.49	39429.80	9
124	85	82	5.00	2004.99	10024.95	9
125	86	95	1.00	3000.00	3000.00	9
126	87	53	114.00	70.00	7980.00	9
127	87	61	5.00	50.00	250.00	9
128	88	96	3768.00	41.24	155392.32	18
129	89	97	3468.00	53.92	186994.56	19
130	90	98	2747.00	42.96	118011.12	20
131	91	69	2.00	1704.00	3408.00	10
132	91	72	60.00	1771.16	106269.60	10
133	91	74	58.00	1771.16	102727.28	10
134	92	104	1.00	3500.00	3500.00	10
135	93	61	55.00	50.00	2750.00	10
136	93	63	60.00	50.00	3000.00	10
137	93	70	50.00	50.00	2500.00	10
138	93	73	25.00	50.00	1250.00	10
139	94	74	2.00	1771.16	3542.32	13
140	94	75	38.00	50.00	1900.00	13
141	95	75	22.00	50.00	1100.00	13
142	95	77	8.00	1771.16	14169.28	13
143	97	73	35.00	50.00	1750.00	13
144	97	78	40.00	47.00	1880.00	13
145	98	105	1.00	2150.00	2150.00	13
146	99	106	1530.00	41.31	63204.30	21
147	100	77	32.00	1771.16	56677.12	12
148	100	80	3.00	1771.16	5313.48	12
149	101	120	10.00	125.00	1250.00	12
150	102	78	20.00	47.00	940.00	12
151	102	81	60.00	41.70	2502.00	12
152	102	83	5.00	41.66	208.30	12
153	103	80	57.00	1771.16	100956.12	11
154	103	86	18.00	1804.66	32483.88	11
155	104	170	10.00	100.00	1000.00	11
156	105	83	55.00	41.66	2291.30	11
157	105	85	60.00	50.00	3000.00	11
158	105	89	10.00	41.67	416.70	11
159	106	82	20.00	2004.99	40099.80	14
160	107	86	42.00	1804.66	75795.72	14
161	107	88	6.00	1805.00	10830.00	14
162	108	89	50.00	41.67	2083.50	14
163	108	90	31.00	41.67	1291.77	14
164	109	171	20.00	100.00	2000.00	14
165	110	88	20.00	1805.00	36100.00	14
166	111	88	17.00	1805.00	30685.00	16
167	111	92	50.00	1804.66	90233.00	16
168	111	93	60.00	1804.67	108280.20	16
169	111	99	53.00	1804.66	95646.98	16
170	112	90	29.00	41.67	1208.43	16
171	112	94	60.00	45.00	2700.00	16
172	112	110	129.00	46.00	5934.00	16
173	113	172	35.00	100.00	3500.00	16
174	114	99	7.00	1804.66	12632.62	15
175	114	101	40.00	1804.66	72186.40	15
176	114	103	45.00	1804.66	81209.70	15
177	114	107	13.00	1841.51	23939.63	15
178	115	110	111.00	46.00	5106.00	15
179	115	111	14.00	50.00	700.00	15
180	116	173	20.00	100.00	2000.00	15
181	117	107	47.00	1841.51	86550.97	17
182	117	109	32.00	1908.00	61056.00	17
183	117	114	28.00	1908.00	53424.00	17
184	118	111	129.00	50.00	6450.00	17
185	119	174	10.00	100.00	1000.00	17
186	120	82	37.00	2004.99	74184.63	18
187	121	114	32.00	1908.00	61056.00	18
188	121	116	40.00	1908.00	76320.00	18
189	121	118	40.00	1908.00	76320.00	18
190	121	119	60.00	1908.00	114480.00	18
191	121	121	20.00	1908.00	38160.00	18
192	122	111	217.00	50.00	10850.00	18
193	122	126	12.00	50.00	600.00	18
194	123	175	35.00	100.00	3500.00	18
195	124	82	18.00	2004.99	36089.82	20
196	124	87	9.00	2005.00	18045.00	20
197	125	121	40.00	1908.00	76320.00	20
198	125	123	20.00	1908.00	38160.00	20
199	126	126	87.00	50.00	4350.00	20
200	127	176	10.00	100.00	1000.00	20
201	128	87	8.00	2005.00	16040.00	19
202	128	91	10.00	2005.00	20050.00	19
203	128	100	15.00	2004.99	30074.85	19
204	129	123	40.00	1908.00	76320.00	19
205	129	125	50.00	1908.00	95400.00	19
206	129	122	60.00	1908.00	114480.00	19
207	129	128	10.00	1908.00	19080.00	19
208	130	126	141.00	50.00	7050.00	19
209	130	140	52.00	50.00	2600.00	19
210	131	177	20.00	100.00	2000.00	19
211	132	100	5.00	2004.99	10024.95	21
212	132	102	10.00	2004.99	20049.90	21
213	133	128	18.00	1908.00	34344.00	21
214	133	131	57.00	1931.96	110121.72	21
215	134	178	15.00	100.00	1500.00	21
216	135	140	90.00	50.00	4500.00	21
217	136	179	1750.00	35.00	61250.00	22
218	137	180	2805.00	35.29	98988.45	23
219	138	131	3.00	1931.96	5795.88	22
220	138	133	55.00	1931.96	106257.80	22
221	138	135	30.00	1931.96	57958.80	22
222	139	102	5.00	2004.99	10024.95	22
223	139	108	11.00	2108.00	23188.00	22
224	140	140	104.00	50.00	5200.00	22
225	141	181	10.00	100.00	1000.00	22
226	142	108	17.00	2108.00	35836.00	23
228	143	135	10.00	1931.96	19319.60	23
229	143	137	55.00	1931.96	106257.80	23
230	143	139	40.00	1931.96	77278.40	23
231	143	141	32.00	1931.96	61822.72	23
232	144	140	165.00	50.00	8250.00	23
233	146	183	20.00	100.00	2000.00	23
234	147	190	2550.00	53.92	137496.00	24
236	149	141	28.00	1931.96	54094.88	24
237	149	144	35.00	1931.96	67618.60	24
238	149	145	55.00	1931.96	106257.80	24
239	150	140	9.00	50.00	450.00	24
240	150	148	109.00	50.00	5450.00	24
241	151	191	20.00	100.00	2000.00	24
242	152	192	3115.00	35.29	109928.35	25
244	154	145	5.00	1931.96	9659.80	25
245	154	147	49.00	1931.96	94666.04	25
246	154	130	60.00	1931.96	115917.60	25
247	154	151	40.00	1988.91	79556.40	25
248	155	148	131.00	50.00	6550.00	25
249	155	158	53.00	50.00	2650.00	25
250	156	193	15.00	100.00	1500.00	25
251	157	194	1479.00	29.26	43275.54	26
253	159	151	20.00	1988.91	39778.20	26
254	159	150	31.00	2022.41	62694.71	26
255	160	158	66.00	50.00	3300.00	26
256	161	195	10.00	100.00	1000.00	26
281	142	117	11.00	2108.00	23188.00	23
282	148	117	9.00	2108.00	18972.00	24
283	148	124	10.00	2108.84	21088.40	24
284	148	127	6.00	2108.84	12653.04	24
285	153	127	26.00	2108.84	54829.84	25
286	153	132	4.00	2149.04	8596.16	25
287	158	132	1.00	2149.04	2149.04	26
288	158	134	14.00	2149.04	30086.56	26
289	162	196	1724.00	31.36	54064.64	27
290	163	134	6.00	2149.04	12894.24	27
291	163	136	5.00	2149.04	10745.20	27
292	163	138	6.00	2149.04	12894.24	27
293	164	150	29.00	2022.41	58649.89	27
294	164	153	30.00	2022.41	60672.30	27
295	164	154	30.00	2022.41	60672.30	27
296	165	158	106.00	50.00	5300.00	27
297	166	197	10.00	100.00	1000.00	27
298	167	199	2135.00	30.83	65822.05	28
299	168	138	14.00	2149.04	30086.56	28
300	168	143	6.00	2149.04	12894.24	28
301	169	154	30.00	2022.41	60672.30	28
302	169	182	20.00	100.00	2000.00	28
303	169	156	31.00	2049.21	63525.51	28
304	170	158	101.00	50.00	5050.00	28
305	171	197	10.00	100.00	1000.00	28
306	172	220	1000.00	50.00	50000.00	37
307	173	146	10.00	2149.04	21490.40	37
308	174	188	10.00	2190.00	21900.00	37
309	175	51	2.00	1782.40	3564.80	37
310	176	206	10.00	2399.00	23990.00	38
311	177	240	1000.00	50.00	50000.00	39
312	178	152	30.00	2283.04	68491.20	39
313	178	155	10.00	2316.54	23165.40	39
314	178	161	6.00	2350.00	14100.00	39
315	178	164	4.00	2350.00	9400.00	39
316	179	157	10.00	2049.21	20492.10	40
\.


--
-- Data for Name: batch_allocations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.batch_allocations (allocation_id, requirement_id, allocated_qty, allocated_value, allocation_date, allocated_by) FROM stdin;
1	1	1530.00	82497.60	2026-03-03	1
2	2	2238.00	121008.66	2026-03-03	1
3	3	3541.00	159805.33	2026-03-03	1
4	4	2550.00	117478.50	2026-03-03	1
5	5	2295.00	116999.10	2026-03-03	1
6	6	3468.00	176798.64	2026-03-03	1
7	7	1989.00	107246.88	2026-03-03	1
8	8	20.00	38241.00	2026-03-04	1
9	9	30.00	57361.50	2026-03-04	1
10	10	40.00	70182.00	2026-03-04	1
11	11	10.00	19120.50	2026-03-04	1
12	12	20.00	37987.17	2026-03-04	1
13	13	100.00	172367.40	2026-03-04	1
14	14	18.00	32893.92	2026-03-04	1
15	15	80.00	134188.80	2026-03-04	1
16	16	35.00	63960.40	2026-03-04	1
17	17	55.00	92254.80	2026-03-04	1
18	18	22.00	40203.68	2026-03-04	1
19	19	30.00	50320.80	2026-03-04	1
20	20	2805.00	148496.70	2026-03-04	1
21	21	20.00	36548.80	2026-03-04	1
22	22	21.00	35224.56	2026-03-10	1
23	23	12.00	19806.72	2026-03-10	1
24	24	8.00	14619.52	2026-03-11	1
25	25	32.00	53675.52	2026-03-11	1
26	26	69.00	115737.84	2026-03-11	1
27	27	62.00	108377.08	2026-03-11	1
28	28	74.00	131424.00	2026-03-11	1
29	29	104.00	184704.00	2026-03-11	1
30	30	5.00	9137.20	2026-03-11	1
31	31	1.00	1776.00	2026-03-11	1
32	32	10.00	1600.00	2026-03-11	1
33	33	10.00	16394.48	2026-03-12	1
34	34	2.00	3190.00	2026-03-12	1
35	35	10.00	1500.00	2026-03-12	1
36	36	1931.00	104505.72	2026-03-12	1
37	37	12.00	21929.28	2026-03-12	1
38	38	3162.00	173593.80	2026-03-14	1
39	39	30.00	55878.45	2026-03-16	1
40	40	2344.00	131099.92	2026-03-18	1
41	41	1428.00	78397.20	2026-03-22	1
42	42	10.00	18776.90	2026-03-22	1
43	43	53.00	84535.00	2026-03-23	1
44	44	179.00	7657.62	2026-03-23	1
45	45	71.00	122051.76	2026-03-23	1
46	46	60.00	97200.12	2026-03-23	1
47	47	216.00	14167.98	2026-03-23	1
48	48	40.00	67094.40	2026-03-24	1
49	49	25.00	44355.36	2026-03-24	1
50	50	1922.00	106401.92	2026-03-26	1
51	51	27.00	50697.63	2026-03-26	1
52	52	1422.00	78394.86	2026-03-26	1
53	53	13.00	24677.97	2026-03-26	1
54	54	2025.00	111496.50	2026-03-28	1
55	55	20.00	38089.80	2026-03-28	1
56	56	23.00	43803.27	2026-03-30	1
57	57	27.00	48729.60	2026-03-30	1
58	58	40.00	72192.00	2026-03-30	1
59	59	5.00	9522.45	2026-03-30	1
60	60	75.00	129221.47	2026-03-30	1
61	61	35.00	59645.95	2026-03-30	1
62	62	63.00	106622.08	2026-03-30	1
63	64	75.00	133680.00	2026-03-30	1
64	65	10.00	17041.70	2026-03-30	1
66	66	3718.00	210773.42	2026-03-30	1
67	67	34.00	59954.38	2026-03-30	1
68	68	24.00	42777.60	2026-03-30	1
69	69	150.00	7800.15	2026-03-30	1
70	70	10.00	2800.00	2026-03-30	1
71	71	38.00	72102.62	2026-03-30	1
72	72	52.00	90025.66	2026-03-30	1
73	73	2244.00	114399.12	2026-04-03	1
74	74	22.00	41898.78	2026-04-04	1
75	75	30.00	51121.70	2026-04-06	1
76	76	1.00	280.00	2026-04-06	1
77	77	200.00	4430.00	2026-04-06	1
78	78	100.00	4167.00	2026-04-06	1
79	79	50.00	1733.40	2026-04-06	1
80	80	50.00	500.00	2026-04-06	1
81	81	4.00	40.00	2026-04-06	1
82	82	28.00	47712.00	2026-04-08	1
83	83	191.00	9844.85	2026-04-08	1
84	84	10.00	2950.00	2026-04-08	1
85	85	27.00	53263.73	2026-04-20	1
86	87	1.00	3000.00	2026-04-20	1
87	88	119.00	8230.00	2026-04-20	1
88	89	3768.00	155392.32	2026-04-20	1
89	90	3468.00	186994.56	2026-04-20	1
90	91	2747.00	118011.12	2026-04-20	1
91	92	120.00	212404.88	2026-04-24	1
92	93	1.00	3500.00	2026-04-24	1
93	94	190.00	9500.00	2026-04-24	1
94	95	40.00	5442.32	2026-04-25	1
95	96	30.00	15269.28	2026-04-25	1
97	98	75.00	3630.00	2026-04-25	1
98	97	1.00	2150.00	2026-04-25	1
99	99	1530.00	63204.30	2026-04-25	1
100	100	35.00	61990.60	2026-05-13	1
101	101	10.00	1250.00	2026-05-13	1
102	102	85.00	3650.30	2026-05-13	1
103	103	75.00	133440.00	2026-06-22	1
104	104	10.00	1000.00	2026-06-22	1
105	105	125.00	5708.00	2026-06-22	1
106	106	20.00	40099.80	2026-06-22	1
107	107	48.00	86625.72	2026-06-22	1
108	108	81.00	3375.27	2026-06-22	1
109	109	20.00	2000.00	2026-06-22	1
110	110	20.00	36100.00	2026-06-22	1
111	111	180.00	324845.18	2026-06-22	1
112	112	218.00	9842.43	2026-06-22	1
113	113	35.00	3500.00	2026-06-22	1
114	114	105.00	189968.35	2026-06-22	1
115	115	125.00	5806.00	2026-06-22	1
116	116	20.00	2000.00	2026-06-22	1
117	117	107.00	201030.97	2026-06-22	1
118	118	129.00	6450.00	2026-06-22	1
119	119	10.00	1000.00	2026-06-22	1
120	120	37.00	74184.63	2026-06-22	1
121	121	192.00	366336.00	2026-06-22	1
122	122	229.00	11450.00	2026-06-22	1
123	123	35.00	3500.00	2026-06-22	1
124	124	27.00	54134.82	2026-06-22	1
125	125	60.00	114480.00	2026-06-22	1
126	126	87.00	4350.00	2026-06-22	1
127	127	10.00	1000.00	2026-06-22	1
128	128	33.00	66164.85	2026-06-22	1
129	129	160.00	305280.00	2026-06-22	1
130	130	193.00	9650.00	2026-06-22	1
131	131	20.00	2000.00	2026-06-22	1
132	132	15.00	30074.85	2026-06-23	1
133	133	75.00	144465.72	2026-06-23	1
134	135	15.00	1500.00	2026-06-23	1
135	136	90.00	4500.00	2026-06-23	1
136	137	1750.00	61250.00	2026-06-23	1
137	138	2805.00	98988.45	2026-06-23	1
138	140	88.00	170012.48	2026-06-23	1
139	139	16.00	33212.95	2026-06-23	1
140	141	104.00	5200.00	2026-06-23	1
141	142	10.00	1000.00	2026-06-23	1
143	144	137.00	264678.52	2026-06-23	1
144	145	165.00	8250.00	2026-06-23	1
146	146	20.00	2000.00	2026-06-23	1
147	147	2550.00	137496.00	2026-06-24	1
149	149	118.00	227971.28	2026-06-24	1
150	150	118.00	5900.00	2026-06-24	1
151	151	20.00	2000.00	2026-06-24	1
152	152	3115.00	109928.35	2026-06-24	1
154	154	154.00	299799.84	2026-06-24	1
155	155	184.00	9200.00	2026-06-24	1
156	156	15.00	1500.00	2026-06-24	1
157	157	1479.00	43275.54	2026-06-24	1
159	159	51.00	102472.91	2026-06-24	1
160	160	66.00	3300.00	2026-06-24	1
161	161	10.00	1000.00	2026-06-24	1
142	143	28.00	59024.00	2026-06-23	1
148	148	25.00	52713.44	2026-06-24	1
153	153	30.00	63426.00	2026-06-24	1
158	158	15.00	32235.60	2026-06-24	1
162	162	1724.00	54064.64	2026-06-30	1
163	163	17.00	36533.68	2026-06-30	1
164	164	89.00	179994.49	2026-06-30	1
165	165	106.00	5300.00	2026-06-30	1
166	166	10.00	1000.00	2026-06-30	1
167	167	2135.00	65822.05	2026-07-01	1
168	168	20.00	42980.80	2026-07-01	1
169	169	81.00	126197.81	2026-07-01	1
170	170	101.00	5050.00	2026-07-01	1
171	171	10.00	1000.00	2026-07-01	1
172	173	1000.00	50000.00	2026-08-17	1
173	174	10.00	21490.40	2026-08-17	1
174	175	10.00	21900.00	2026-08-18	1
175	176	2.00	3564.80	2026-08-18	1
176	177	10.00	23990.00	2026-08-18	1
177	178	1000.00	50000.00	2026-08-31	1
178	179	50.00	115156.60	2026-08-31	1
179	180	10.00	20492.10	2026-09-04	1
\.


--
-- Data for Name: batch_closure_summary; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.batch_closure_summary (id, batch_id, start_date, end_date, initial_chicken_count, available_chicken_count, revenue, gross_profit) FROM stdin;
7	6	2026-02-23	2026-04-04	3468	0	667686.15	53199.21
1	2	2026-01-31	2026-03-10	2238	0	520074.80	133680.29
8	8	2026-03-01	2026-04-20	2805	0	546407.15	57584.37
2	7	2026-02-23	2026-03-11	1989	0	457711.90	109824.30
3	1	2026-01-29	2026-03-10	1530	0	360216.15	65087.25
9	9	2026-03-08	2026-04-20	1931	0	442222.85	112550.20
4	4	2026-02-12	2026-03-23	2550	0	585611.30	153991.70
10	10	2026-03-13	2026-04-24	3162	0	530221.30	8249.77
11	13	2026-03-22	2026-04-21	1922	0	170744.25	-11111.70
5	3	2026-02-08	2026-03-23	3541	0	689179.30	148876.11
13	11	2026-03-18	2026-04-27	2344	0	372521.04	8740.25
14	14	2026-03-25	2026-05-02	1422	0	221732.37	-9441.45
12	12	2026-03-18	2026-04-29	1428	0	279912.05	43655.05
6	5	2026-02-19	2026-03-30	2295	0	373819.05	-3130.26
15	16	2026-03-28	2026-05-03	3718	0	784377.05	163313.40
16	15	2026-03-28	2026-05-04	2025	0	459171.04	111810.39
17	17	2026-04-03	2026-05-11	2244	0	461138.45	96359.58
18	18	2026-04-09	2026-05-18	3768	0	717735.75	106872.80
19	20	2026-04-12	2026-05-17	2747	0	185105.38	-106870.56
20	19	2026-04-15	2026-05-17	3468	0	430627.92	-139461.49
21	21	2026-04-22	2026-05-27	1530	0	187589.67	-56155.20
22	22	2026-04-26	2026-06-04	1750	190	273227.11	2551.68
23	23	2026-04-29	2026-06-08	2805	0	401823.35	-8149.62
24	24	2026-04-17	2026-05-29	2550	0	260561.25	-113306.03
25	25	2026-05-01	2026-06-09	3115	406	401823.35	-19204.84
26	26	2026-05-08	2026-06-14	1479	259	234042.68	51758.63
27	27	2026-05-10	2026-06-19	1724	0	291968.09	15075.28
28	28	2026-05-13	2026-08-06	2135	2135	0.00	-241050.66
29	37	2026-08-18	2026-09-04	1000	900	0.00	-96955.20
30	40	2026-09-04	2026-09-04	3000	2990	0.00	-20492.10
\.


--
-- Data for Name: batch_requirements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.batch_requirements (requirement_id, batch_id, line_id, supervisor_id, item_code, quantity, status, request_date) FROM stdin;
1	1	1	2	SC101	1530.00	accept	2026-03-03
2	2	1	2	SC101	2238.00	accept	2026-03-03
3	3	1	2	SC101	3541.00	accept	2026-03-03
4	4	1	2	SC101	2550.00	accept	2026-03-03
5	5	1	2	SC101	2295.00	accept	2026-03-03
6	6	1	2	SC101	3468.00	accept	2026-03-03
7	7	1	2	SC101	1989.00	accept	2026-03-03
8	5	1	2	FD101	20.00	accept	2026-03-04
9	6	1	2	FD101	30.00	accept	2026-03-04
10	7	1	2	FD102	40.00	accept	2026-03-04
11	1	1	2	FD101	10.00	accept	2026-03-04
12	2	1	2	FD101	20.00	accept	2026-03-04
13	2	1	2	FD102	100.00	accept	2026-03-04
14	7	1	2	FD101	18.00	accept	2026-03-04
15	7	1	2	FD102	80.00	accept	2026-03-04
16	3	1	2	FD101	35.00	accept	2026-03-04
17	3	1	2	FD102	55.00	accept	2026-03-04
18	4	1	2	FD101	22.00	accept	2026-03-04
19	4	1	2	FD102	30.00	accept	2026-03-04
20	8	1	2	SC101	2805.00	accept	2026-03-04
21	8	1	2	FD101	20.00	accept	2026-03-04
22	2	1	2	FD102	21.00	accept	2026-03-10
23	2	1	2	FD103	12.00	accept	2026-03-10
24	8	1	2	FD101	8.00	accept	2026-03-11
25	8	1	2	FD102	32.00	accept	2026-03-11
26	6	1	2	FD102	69.00	accept	2026-03-11
27	5	1	2	FD102	62.00	accept	2026-03-11
28	4	1	2	FD102	74.00	accept	2026-03-11
29	1	1	2	FD102	104.00	accept	2026-03-11
30	1	1	2	FD101	5.00	accept	2026-03-11
31	7	1	2	FD102	1.00	accept	2026-03-11
32	7	1	2	MD101	10.00	accept	2026-03-11
33	1	1	2	FD103	10.00	accept	2026-03-12
34	1	1	2	FD103	2.00	accept	2026-03-12
35	1	1	2	MD101	10.00	accept	2026-03-12
36	9	1	2	SC101	1931.00	accept	2026-03-12
37	9	1	2	FD101	12.00	accept	2026-03-12
38	10	1	2	SC101	3162.00	accept	2026-03-14
39	10	1	2	FD101	30.00	accept	2026-03-16
40	11	1	2	SC101	2344.00	accept	2026-03-18
41	12	1	2	SC101	1428.00	accept	2026-03-22
42	12	1	2	FD101	10.00	accept	2026-03-22
43	4	1	2	FD103	53.00	accept	2026-03-23
44	4	1	2	FD104	179.00	accept	2026-03-23
45	3	1	2	FD102	71.00	accept	2026-03-23
46	3	1	2	FD103	60.00	accept	2026-03-23
47	3	1	2	FD104	216.00	accept	2026-03-23
48	10	1	2	FD102	40.00	accept	2026-03-24
49	8	1	2	FD102	25.00	accept	2026-03-24
50	13	1	2	SC101	1922.00	accept	2026-03-26
51	13	1	2	FD101	27.00	accept	2026-03-26
52	14	1	2	SC101	1422.00	accept	2026-03-26
53	14	1	2	FD101	13.00	accept	2026-03-26
54	15	1	2	SC101	2025.00	accept	2026-03-28
55	15	1	2	FD101	20.00	accept	2026-03-28
56	11	1	2	FD101	23.00	accept	2026-03-30
57	11	1	2	FD102	27.00	accept	2026-03-30
58	12	1	2	FD102	40.00	accept	2026-03-30
59	9	1	2	FD101	5.00	accept	2026-03-30
60	9	1	2	FD102	75.00	accept	2026-03-30
61	8	1	2	FD102	35.00	accept	2026-03-30
62	8	1	2	FD103	63.00	accept	2026-03-30
64	6	1	2	FD103	75.00	accept	2026-03-30
65	13	1	2	FD102	10.00	accept	2026-03-30
63	6	1	2	FD102	52.00	decline	2026-03-30
66	16	1	2	SC101	3718.00	accept	2026-03-30
67	5	1	2	FD102	34.00	accept	2026-03-30
68	5	1	2	FD103	24.00	accept	2026-03-30
69	5	1	2	FD104	150.00	accept	2026-03-30
70	5	1	2	MD101	10.00	accept	2026-03-30
71	16	1	2	FD101	38.00	accept	2026-03-30
72	6	1	2	FD102	52.00	accept	2026-03-30
73	17	1	2	SC101	2244.00	accept	2026-04-03
74	17	1	2	FD101	22.00	accept	2026-04-04
75	6	1	2	FD102	30.00	accept	2026-04-06
76	6	1	2	MD101	1.00	accept	2026-04-06
77	6	1	2	MD101	200.00	accept	2026-04-06
78	6	1	2	FD104	100.00	accept	2026-04-06
79	6	1	2	FD104	50.00	accept	2026-04-06
80	6	1	2	MD101	50.00	accept	2026-04-06
81	6	1	2	MD101	4.00	accept	2026-04-06
82	8	1	2	FD102	28.00	accept	2026-04-08
83	8	1	2	FD104	191.00	accept	2026-04-08
84	8	1	2	MD101	10.00	accept	2026-04-08
85	9	1	2	FD101	27.00	accept	2026-04-20
86	9	1	2	MD101	1.00	pending	2026-04-20
87	9	1	2	MD101	1.00	accept	2026-04-20
88	9	1	2	FD104	119.00	accept	2026-04-20
89	18	1	2	SC101	3768.00	accept	2026-04-20
90	19	1	2	SC101	3468.00	accept	2026-04-20
91	20	1	2	SC101	2747.00	accept	2026-04-20
92	10	1	2	FD102	120.00	accept	2026-04-24
93	10	1	2	MD101	1.00	accept	2026-04-24
94	10	1	2	FD104	190.00	accept	2026-04-24
95	13	1	2	FD102	40.00	accept	2026-04-25
96	13	1	2	FD102	30.00	accept	2026-04-25
98	13	1	2	FD104	75.00	accept	2026-04-25
97	13	1	2	MD101	1.00	accept	2026-04-25
99	21	1	2	SC101	1530.00	accept	2026-04-25
100	12	1	2	FD102	35.00	accept	2026-05-13
101	12	1	2	MD101	10.00	accept	2026-05-13
102	12	1	2	FD104	85.00	accept	2026-05-13
103	11	1	2	FD102	75.00	accept	2026-06-22
104	11	1	2	MD101	10.00	accept	2026-06-22
105	11	1	2	FD104	125.00	accept	2026-06-22
106	14	1	2	FD101	20.00	accept	2026-06-22
107	14	1	2	FD102	48.00	accept	2026-06-22
108	14	1	2	FD104	81.00	accept	2026-06-22
109	14	1	2	MD101	20.00	accept	2026-06-22
110	14	1	2	FD102	20.00	accept	2026-06-22
111	16	1	2	FD102	180.00	accept	2026-06-22
112	16	1	2	FD104	218.00	accept	2026-06-22
113	16	1	2	MD101	35.00	accept	2026-06-22
114	15	1	2	FD102	105.00	accept	2026-06-22
115	15	1	2	FD104	125.00	accept	2026-06-22
116	15	1	2	MD101	20.00	accept	2026-06-22
117	17	1	2	FD102	107.00	accept	2026-06-22
118	17	1	2	FD104	129.00	accept	2026-06-22
119	17	1	2	MD101	10.00	accept	2026-06-22
120	18	1	2	FD101	37.00	accept	2026-06-22
121	18	1	2	FD102	192.00	accept	2026-06-22
122	18	1	2	FD104	229.00	accept	2026-06-22
123	18	1	2	MD101	35.00	accept	2026-06-22
124	20	1	2	FD101	27.00	accept	2026-06-22
125	20	1	2	FD102	60.00	accept	2026-06-22
126	20	1	2	FD104	87.00	accept	2026-06-22
127	20	1	2	MD101	10.00	accept	2026-06-22
128	19	1	2	FD101	33.00	accept	2026-06-22
129	19	1	2	FD102	160.00	accept	2026-06-22
130	19	1	2	FD104	193.00	accept	2026-06-22
131	19	1	2	MD101	20.00	accept	2026-06-22
132	21	1	2	FD101	15.00	accept	2026-06-23
133	21	1	2	FD102	75.00	accept	2026-06-23
134	21	1	2	FD102	15.00	decline	2026-06-23
135	21	1	2	MD101	15.00	accept	2026-06-23
136	21	1	2	FD104	90.00	accept	2026-06-23
137	22	1	2	SC101	1750.00	accept	2026-06-23
138	23	1	2	SC101	2805.00	accept	2026-06-23
140	22	1	2	FD102	88.00	accept	2026-06-23
139	22	1	2	FD101	16.00	accept	2026-06-23
141	22	1	2	FD104	104.00	accept	2026-06-23
142	22	1	2	MD101	10.00	accept	2026-06-23
143	23	1	2	FD101	28.00	accept	2026-06-23
144	23	1	2	FD102	137.00	accept	2026-06-23
145	23	1	2	FD104	165.00	accept	2026-06-23
146	23	1	2	MD101	20.00	accept	2026-06-23
147	24	1	2	SC101	2550.00	accept	2026-06-24
148	24	1	2	FD101	25.00	accept	2026-06-24
149	24	1	2	FD102	118.00	accept	2026-06-24
150	24	1	2	FD104	118.00	accept	2026-06-24
151	24	1	2	MD101	20.00	accept	2026-06-24
152	25	1	2	SC101	3115.00	accept	2026-06-24
153	25	1	2	FD101	30.00	accept	2026-06-24
154	25	1	2	FD102	154.00	accept	2026-06-24
155	25	1	2	FD104	184.00	accept	2026-06-24
156	25	1	2	MD101	15.00	accept	2026-06-24
157	26	1	2	SC101	1479.00	accept	2026-06-24
158	26	1	2	FD101	15.00	accept	2026-06-24
159	26	1	2	FD102	51.00	accept	2026-06-24
160	26	1	2	FD104	66.00	accept	2026-06-24
161	26	1	2	MD101	10.00	accept	2026-06-24
162	27	1	2	SC101	1724.00	accept	2026-06-30
163	27	1	2	FD101	17.00	accept	2026-06-30
164	27	1	2	FD102	89.00	accept	2026-06-30
165	27	1	2	FD104	106.00	accept	2026-06-30
166	27	1	2	MD101	10.00	accept	2026-06-30
167	28	1	2	SC101	2135.00	accept	2026-07-01
168	28	1	2	FD101	20.00	accept	2026-07-01
169	28	1	2	FD102	81.00	accept	2026-07-01
170	28	1	2	FD104	101.00	accept	2026-07-01
171	28	1	2	MD101	10.00	accept	2026-07-01
173	37	1	2	SC101	1000.00	accept	2026-08-17
174	37	1	2	FD101	10.00	accept	2026-08-17
175	37	1	2	FD102	10.00	accept	2026-08-18
176	37	1	2	FD103	2.00	accept	2026-08-18
177	38	1	2	FD101	10.00	accept	2026-08-18
172	28	1	2	FD101	20.00	decline	2026-08-06
178	39	1	2	SC101	1000.00	accept	2026-08-31
179	39	1	2	FD101	50.00	accept	2026-08-31
180	40	1	2	FD102	10.00	accept	2026-09-04
\.


--
-- Data for Name: batch_sales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.batch_sales (id, item_code, batch_id, trader_id, avg_weight, rate, quantity, value, created_at, payment_type, sale_date, app_trader_id) FROM stdin;
1	DC101	2	1	533.4	106	230	56540.399999999994	2026-03-10 14:02:10.747325+00	RECEIVABLE	2026-01-01	\N
2	DC101	2	2	1503.1	108	650	162334.8	2026-03-10 14:27:55.179464+00	RECEIVABLE	2026-01-01	\N
3	DC101	2	3	995.45	106	434	105517.7	2026-03-10 14:28:38.216659+00	RECEIVABLE	2026-01-01	\N
4	DC101	2	4	495.45	106	217	52517.7	2026-03-10 14:29:16.1791+00	RECEIVABLE	2026-01-01	\N
5	DC101	2	5	587.2	106	260	62243.2	2026-03-10 14:30:00.557679+00	RECEIVABLE	2026-01-01	\N
6	DC101	2	3	642.8	107	272	68779.59999999999	2026-03-10 14:30:29.41979+00	RECEIVABLE	2026-01-01	\N
7	DC101	2	3	102.2	107	50	10935.4	2026-03-10 14:30:57.861319+00	RECEIVABLE	2026-01-01	\N
8	DC101	2	3	20.1	60	24	1206	2026-03-10 14:31:24.752096+00	RECEIVABLE	2026-01-01	\N
9	DC101	7	7	1276	104	545	132704	2026-03-11 12:11:30.52871+00	CASH	2026-01-01	\N
10	DC101	7	7	171.8	104	79	17867.2	2026-03-11 12:16:12.91105+00	RECEIVABLE	2026-01-01	\N
11	DC101	7	6	1276	104	545	132704	2026-03-11 12:16:47.099217+00	RECEIVABLE	2026-01-01	\N
12	DC101	7	4	1194.8	104	501	124259.2	2026-03-11 12:17:35.224523+00	RECEIVABLE	2026-01-01	\N
13	DC101	7	4	473.75	104	210	49270.00	2026-03-11 12:18:49.720176+00	RECEIVABLE	2026-01-01	\N
14	DC101	7	4	16.5	55	19	907.5	2026-03-11 12:19:11.690631+00	RECEIVABLE	2026-01-01	\N
15	DC101	1	8	1028.75	107	433	110076.25	2026-03-12 05:52:16.996845+00	RECEIVABLE	2026-01-01	\N
16	DC101	1	9	1204.3	107	524	128860.1	2026-03-12 05:52:40.850363+00	RECEIVABLE	2026-01-01	\N
17	DC101	1	3	307.9	107	137	32945.3	2026-03-12 05:53:12.2641+00	RECEIVABLE	2026-01-01	\N
18	DC101	1	2	804.5	109	359	87690.5	2026-03-12 05:53:58.524997+00	RECEIVABLE	2026-01-01	\N
19	DC101	1	10	9.2	70	14	644.0	2026-03-12 05:54:21.281959+00	RECEIVABLE	2026-01-01	\N
20	DC101	4	2	621.9	110	277	68409.0	2026-03-23 09:44:19.737859+00	RECEIVABLE	2026-01-01	\N
21	DC101	4	2	376.45	110	168	41409.50	2026-03-23 09:44:38.587787+00	RECEIVABLE	2026-01-01	\N
22	DC101	4	5	882.15	112	396	98800.80	2026-03-23 09:45:14.40274+00	RECEIVABLE	2026-01-01	\N
23	DC101	4	7	1504.8	110	689	165528.0	2026-03-23 09:45:41.499526+00	RECEIVABLE	2026-01-01	\N
24	DC101	4	11	283.7	110	128	31207.0	2026-03-23 09:46:12.381275+00	RECEIVABLE	2026-01-01	\N
25	DC101	4	4	843.2	110	385	92752.0	2026-03-23 09:46:35.543569+00	RECEIVABLE	2026-01-01	\N
26	DC101	4	3	785.9	110	360	86449.0	2026-03-23 09:47:41.363293+00	RECEIVABLE	2026-01-01	\N
27	DC101	4	3	17.6	60	17	1056.0	2026-03-23 09:48:06.870857+00	RECEIVABLE	2026-01-01	\N
28	DC101	3	12	860.25	114	445	98068.50	2026-03-23 11:32:31.722761+00	RECEIVABLE	2026-01-01	\N
29	DC101	3	4	452.8	114	232	51619.2	2026-03-23 11:33:01.761962+00	RECEIVABLE	2026-01-01	\N
30	DC101	3	3	717.15	114	361	81755.10	2026-03-23 11:33:37.521226+00	RECEIVABLE	2026-01-01	\N
31	DC101	3	13	533.5	113	264	60285.5	2026-03-23 11:34:34.39715+00	RECEIVABLE	2026-01-01	\N
32	DC101	3	14	1007.05	114	512	114803.70	2026-03-23 11:35:53.614629+00	RECEIVABLE	2026-01-01	\N
33	DC101	3	7	671.2	114	340	76516.8	2026-03-23 11:36:34.473846+00	RECEIVABLE	2026-01-01	\N
34	DC101	3	2	686.6	112	354	76899.2	2026-03-23 11:37:05.315705+00	RECEIVABLE	2026-01-01	\N
35	DC101	3	14	648.1	113	339	73235.3	2026-03-23 11:37:43.603044+00	RECEIVABLE	2026-01-01	\N
36	DC101	3	1	357.6	110	190	39336.0	2026-03-23 11:38:07.233076+00	RECEIVABLE	2026-01-01	\N
37	DC101	3	1	21.5	60	26	1290.0	2026-03-23 11:38:24.937658+00	RECEIVABLE	2026-01-01	\N
38	DC101	3	14	114.2	110	60	12562.0	2026-03-23 11:38:44.80492+00	RECEIVABLE	2026-01-01	\N
39	DC101	3	14	46.8	60	64	2808.0	2026-03-23 11:39:04.060111+00	RECEIVABLE	2026-01-01	\N
40	DC101	5	14	869.45	107	446	93031.15	2026-03-30 14:19:03.834788+00	RECEIVABLE	2026-01-01	\N
41	DC101	5	7	1477.9	106	768	156657.4	2026-03-30 14:22:44.800927+00	RECEIVABLE	2026-01-01	\N
42	DC101	5	3	945.55	108	493	102119.40	2026-03-30 14:23:09.369078+00	RECEIVABLE	2026-01-01	\N
43	DC101	5	3	78.85	106	48	8358.10	2026-03-30 14:23:44.075775+00	RECEIVABLE	2026-01-01	\N
44	DC101	5	3	110	55	106	6050	2026-03-30 14:24:33.561192+00	RECEIVABLE	2026-01-01	\N
45	DC101	5	10	63.35	120	30	7602.00	2026-03-30 14:25:15.842985+00	RECEIVABLE	2026-01-01	\N
46	DC101	5	10	0.1	10	106	1.0	2026-03-30 14:26:05.343191+00	RECEIVABLE	2026-01-01	\N
47	DC101	6	6	1581.8	105	738	166089.0	2026-04-06 08:38:17.505425+00	RECEIVABLE	2026-01-01	\N
48	DC101	6	7	903.5	105	426	94867.5	2026-04-06 08:39:06.339017+00	RECEIVABLE	2026-01-01	\N
49	DC101	6	2	1408.6	106	670	149311.6	2026-04-06 08:39:30.681168+00	RECEIVABLE	2026-01-01	\N
50	DC101	6	14	574.8	105	264	60354.0	2026-04-06 08:40:57.766816+00	RECEIVABLE	2026-01-01	\N
51	DC101	6	6	1019.45	104	165	106022.80	2026-04-06 08:41:42.184059+00	RECEIVABLE	2026-01-01	\N
52	DC101	6	2	828.75	105	426	87018.75	2026-04-06 08:42:13.862774+00	RECEIVABLE	2026-01-01	\N
53	DC101	6	2	57.45	70	68	4021.50	2026-04-06 08:42:43.657727+00	RECEIVABLE	2026-01-01	\N
54	DC101	6	10	1	1	387	1	2026-04-06 08:51:13.082047+00	RECEIVABLE	2026-01-01	\N
55	DC101	8	2	1446.5	104	720	150436.0	2026-04-20 10:13:34.022372+00	RECEIVABLE	2026-01-01	\N
56	DC101	8	3	1007.15	104	499	104743.60	2026-04-20 10:14:13.3123+00	RECEIVABLE	2026-01-01	\N
57	DC101	8	13	672.1	103	327	69226.3	2026-04-20 10:15:19.100192+00	RECEIVABLE	2026-01-01	\N
58	DC101	8	15	298.45	104	147	31038.80	2026-04-20 10:18:41.341322+00	RECEIVABLE	2026-01-01	\N
59	DC101	8	14	557.1	103	276	57381.3	2026-04-20 10:19:15.520738+00	RECEIVABLE	2026-01-01	\N
60	DC101	8	6	762.5	101	371	77012.5	2026-04-20 10:20:27.254043+00	RECEIVABLE	2026-01-01	\N
61	DC101	8	7	526.55	103	267	54234.65	2026-04-20 10:21:07.710246+00	RECEIVABLE	2026-01-01	\N
62	DC101	8	7	38.9	60	48	2334.0	2026-04-20 10:22:37.485043+00	RECEIVABLE	2026-01-01	\N
63	DC101	9	14	1261	130	597	163930	2026-04-20 10:34:59.11372+00	RECEIVABLE	2026-01-01	\N
64	DC101	9	14	516.15	130	240	67099.50	2026-04-20 10:35:29.309804+00	RECEIVABLE	2026-01-01	\N
65	DC101	9	7	430.95	130	204	56023.50	2026-04-20 10:36:02.293352+00	RECEIVABLE	2026-01-01	\N
66	DC101	9	14	1173.35	131	546	153708.85	2026-04-20 10:36:40.768737+00	RECEIVABLE	2026-01-01	\N
67	DC101	9	14	18.25	80	38	1460.00	2026-04-20 10:38:15.770408+00	RECEIVABLE	2026-01-01	\N
68	DC101	9	10	1	1	6	1	2026-04-20 10:39:29.426108+00	RECEIVABLE	2026-01-01	\N
69	DC101	10	12	904.1	105	527	94930.5	2026-04-24 07:06:46.519876+00	RECEIVABLE	2026-01-01	\N
70	DC101	10	3	587.6	107	333	62873.2	2026-04-24 07:07:11.832726+00	RECEIVABLE	2026-01-01	\N
71	DC101	10	16	1240.25	105	724	130226.25	2026-04-24 07:07:42.64885+00	RECEIVABLE	2026-01-01	\N
72	DC101	10	12	968.9	105	579	101734.5	2026-04-24 07:10:57.595705+00	RECEIVABLE	2026-01-01	\N
73	DC101	10	15	470.9	104	268	48973.6	2026-04-24 07:12:00.059875+00	RECEIVABLE	2026-01-01	\N
74	DC101	10	5	499.95	107	297	53494.65	2026-04-24 07:12:32.923001+00	RECEIVABLE	2026-01-01	\N
75	DC101	10	14	265.9	104	186	27653.6	2026-04-24 07:13:03.948167+00	RECEIVABLE	2026-01-01	\N
76	DC101	10	14	103.35	100	91	10335.00	2026-04-24 07:15:38.517322+00	RECEIVABLE	2026-01-01	\N
77	DC101	13	10	1779.45	95	1740	169047.75	2026-04-25 02:23:17.48402+00	RECEIVABLE	2026-01-01	\N
78	DC101	13	17	26.1	65	37	1696.5	2026-04-25 02:24:24.759191+00	RECEIVABLE	2026-01-01	\N
79	DC101	12	17	768.5	108	420	82998.0	2026-05-13 05:12:51.616513+00	RECEIVABLE	2026-01-01	\N
80	DC101	12	17	513.2	106	250	54399.2	2026-05-13 05:13:29.468639+00	RECEIVABLE	2026-01-01	\N
82	DC101	12	17	329.65	109	167	35931.85	2026-05-13 05:20:15.428446+00	RECEIVABLE	2026-01-01	\N
83	DC101	11	10	3609.7	103.2	2101	372521.04	2026-06-22 14:36:37.084931+00	RECEIVABLE	2026-01-01	\N
84	DC101	14	10	2032.75	109.08	1284	221732.3700	2026-06-22 14:45:23.048692+00	RECEIVABLE	2026-01-01	\N
85	DC101	12	10	1000	106.583	523	106583.000	2026-06-22 14:49:53.066248+00	RECEIVABLE	2026-01-01	\N
86	DC101	16	10	6745	116.29	2521	784376.05	2026-06-22 14:55:50.192644+00	RECEIVABLE	2026-01-01	\N
87	DC101	16	10	1	1	1000	1	2026-06-22 14:56:24.5751+00	RECEIVABLE	2026-01-01	\N
88	DC101	15	10	3593.45	127.78	1873	459171.0410	2026-06-22 15:00:49.586503+00	RECEIVABLE	2026-01-01	\N
89	DC101	17	10	3935.3	117.18	2130	461138.454	2026-06-22 15:04:47.632001+00	RECEIVABLE	2026-01-01	\N
90	DC101	18	10	6593.2	108.86	3452	717735.752	2026-06-22 15:08:30.050006+00	RECEIVABLE	2026-01-01	\N
91	DC101	20	10	1995.1	92.78	1796	185105.378	2026-06-22 15:11:58.790006+00	RECEIVABLE	2026-01-01	\N
92	DC101	19	10	4376.3	98.4	2876	430627.92	2026-06-22 15:16:09.697796+00	RECEIVABLE	2026-01-01	\N
93	DC101	21	10	2080.4	90.17	1340	187589.668	2026-06-23 11:17:38.228635+00	RECEIVABLE	2026-01-01	\N
94	DC101	22	10	2623.4	104.15	1560	273227.110	2026-06-23 13:24:08.25221+00	RECEIVABLE	2026-01-01	\N
95	DC101	23	10	4400.65	91.31	2453	401823.3515	2026-06-23 13:37:40.027268+00	RECEIVABLE	2026-01-01	\N
96	DC101	24	10	2981.25	87.4	2060	260561.250	2026-06-24 12:14:50.05997+00	RECEIVABLE	2026-01-01	\N
97	DC101	25	10	4400.65	91.31	2453	401823.3515	2026-06-24 12:26:04.416684+00	RECEIVABLE	2026-01-01	\N
98	DC101	26	10	1959.5	119.44	1220	234042.680	2026-06-30 14:25:54.448684+00	RECEIVABLE	2026-01-01	\N
99	DC101	27	10	2828.6	103.22	1600	291968.092	2026-06-30 14:34:34.280862+00	RECEIVABLE	2026-01-01	\N
100	DC101	38	1	2	100	100	20000	2026-08-18 07:10:07.48695+00	CASH	2026-08-18	\N
101	DC101	38	1	2	101	250	50500	2026-08-18 09:46:53.200764+00	CASH	2026-08-18	\N
102	DC101	38	6	100	100	10	10000	2026-08-31 05:25:55.685642+00	RECEIVABLE	2026-01-01	\N
103	DC101	39	20	1000	100	500	100000	2026-08-31 05:52:36.704261+00	RECEIVABLE	2026-01-01	\N
107	DC101	39	1	120	2	111	240	2026-08-31 23:11:09.567111+00	RECEIVABLE	2026-01-01	2
108	DC101	39	1	33	33	33	1089	2026-09-04 11:03:15.713738+00	RECEIVABLE	2026-01-01	2
109	DC101	40	20	100	100	50	10000	2026-09-04 11:10:40.397548+00	RECEIVABLE	2026-01-01	\N
110	DC101	40	1	100	101	20	10100	2026-09-04 11:11:50.591193+00	RECEIVABLE	2026-01-01	2
111	DC101	40	1	2	100	100	20000	2026-09-04 11:18:11.412152+00	CASH	2026-09-04	\N
112	DC101	40	12	1000	100	1700	100000	2026-09-04 11:21:27.789252+00	RECEIVABLE	2026-01-01	\N
\.


--
-- Data for Name: batches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.batches (batch_id, line_id, supervisor_id, farmer_id, start_date, end_date, initial_bird_count, current_bird_count, status, created_at, avg_body_weight, activated_at, closed_at, farm_id) FROM stdin;
12	1	2	12	2026-03-18	2026-04-29	1428	1360	closed	2026-03-22 14:26:11.050135+00	\N	\N	\N	\N
36	1	1	1	2026-08-06	2026-08-06	0	0	closed	2026-08-06 11:38:39.882956+00	\N	\N	2026-08-18 14:05:42.203936+00	3
34	1	1	1	2026-08-06	2026-08-06	0	0	closed	2026-08-06 11:29:30.5406+00	2.50	2026-08-06 11:31:22.296668+00	2026-08-18 14:05:44.309955+00	3
10	1	2	10	2026-03-13	2026-04-24	3162	3005	closed	2026-03-14 08:39:54.120357+00	\N	\N	\N	\N
33	1	1	1	2026-08-04	2026-08-04	0	0	closed	2026-08-03 20:37:34.353333+00	2.50	2026-08-03 20:37:34.353333+00	2026-08-18 14:05:45.540891+00	3
2	1	2	2	2026-01-31	2026-03-10	2238	2137	closed	2026-03-03 05:18:19.739237+00	\N	\N	\N	\N
7	1	2	8	2026-02-23	2026-03-11	1989	1899	closed	2026-03-03 10:10:37.067655+00	\N	\N	\N	\N
1	1	2	1	2026-01-29	2026-03-10	1530	1467	closed	2026-03-03 05:12:23.141033+00	\N	\N	\N	\N
4	1	2	4	2026-02-12	2026-03-23	2550	2420	closed	2026-03-03 05:33:38.296094+00	\N	\N	\N	\N
3	1	2	3	2026-02-08	2026-03-23	3541	3187	closed	2026-03-03 05:20:27.336034+00	\N	\N	\N	\N
35	1	1	1	2026-08-06	2026-08-06	0	0	closed	2026-08-06 11:33:55.141336+00	2.30	2026-08-06 12:00:41.958419+00	2026-08-18 14:05:39.494661+00	3
11	1	2	11	2026-03-18	2026-04-27	2344	2101	closed	2026-03-18 05:33:19.451368+00	\N	\N	\N	\N
38	1	1	19	2026-08-18	2026-08-18	1000	900	closed	2026-08-18 07:02:51.444198+00	2.00	2026-08-18 07:03:22.81415+00	2026-08-31 07:48:26.928598+00	4
14	1	2	1	2026-03-25	2026-05-02	1422	1284	closed	2026-03-26 12:24:30.213276+00	\N	\N	\N	\N
16	1	2	13	2026-03-28	2026-05-03	3718	3521	closed	2026-03-30 14:06:32.150505+00	\N	\N	\N	\N
13	1	2	8	2026-03-22	2026-04-21	1922	1777	closed	2026-03-26 12:20:30.148295+00	\N	\N	\N	\N
15	1	2	2	2026-03-28	2026-05-04	2025	1873	closed	2026-03-28 05:59:58.491361+00	\N	\N	\N	\N
17	1	2	4	2026-04-03	2026-05-11	2244	2130	closed	2026-04-03 09:19:12.561368+00	\N	\N	\N	\N
5	1	2	5	2026-02-19	2026-03-30	2295	1891	closed	2026-03-03 09:47:16.379958+00	\N	\N	\N	\N
6	1	2	6	2026-02-23	2026-04-04	3468	3144	closed	2026-03-03 09:50:36.036339+00	\N	\N	\N	\N
39	1	1	20	2026-08-31	2026-08-31	1000	990	closed	2026-08-31 05:43:00.517634+00	2.00	2026-08-31 06:13:37.794929+00	2026-09-04 11:15:08.981004+00	5
18	1	2	3	2026-04-09	2026-05-18	3768	3452	closed	2026-04-20 11:19:04.756403+00	\N	\N	\N	\N
37	1	2	19	2026-08-18	2026-09-04	1000	900	closed	2026-08-17 14:03:21.748034+00	\N	\N	\N	\N
40	1	1	20	2026-09-04	2026-09-04	3000	2990	closed	2026-09-04 11:04:04.927752+00	2.00	2026-09-04 11:15:30.611285+00	\N	5
20	1	2	14	2026-04-12	2026-05-17	2747	1796	closed	2026-04-20 11:35:38.75938+00	\N	\N	\N	\N
8	1	2	7	2026-03-01	2026-04-20	2805	2655	closed	2026-03-04 10:08:47.887344+00	\N	\N	\N	\N
19	1	2	6	2026-04-15	2026-05-17	3468	2876	closed	2026-04-20 11:29:16.425646+00	\N	\N	\N	\N
21	1	2	15	2026-04-22	2026-05-27	1530	1340	closed	2026-04-25 02:30:42.075974+00	\N	\N	\N	\N
22	1	2	16	2026-04-26	2026-06-04	1750	1560	closed	2026-06-23 11:38:12.794067+00	\N	\N	\N	\N
23	1	2	17	2026-04-29	2026-06-08	2805	2453	closed	2026-06-23 11:41:36.84043+00	\N	\N	\N	\N
24	1	2	7	2026-04-17	2026-05-29	2550	2060	closed	2026-06-24 12:00:00.672127+00	\N	\N	\N	\N
9	1	2	9	2026-03-08	2026-04-20	1931	1631	closed	2026-03-12 13:34:10.661053+00	\N	\N	\N	\N
25	1	2	8	2026-05-01	2026-06-09	3115	2859	closed	2026-06-24 12:18:59.780889+00	\N	\N	\N	\N
26	1	2	12	2026-05-08	2026-06-14	1479	1220	closed	2026-06-24 12:30:34.951866+00	\N	\N	\N	\N
27	1	2	18	2026-05-10	2026-06-19	1724	1600	closed	2026-06-30 14:30:15.900577+00	\N	\N	\N	\N
28	1	2	4	2026-05-13	2026-08-06	2135	2135	closed	2026-07-01 05:17:25.215793+00	\N	\N	\N	\N
\.


--
-- Data for Name: bird_count_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bird_count_history (record_id, batch_id, record_date, deaths, notes, created_at, additions) FROM stdin;
1	7	2026-02-24	7		2026-03-03 10:12:34.013796+00	0
2	7	2026-02-28	8		2026-03-03 10:12:53.882559+00	0
3	5	2026-02-20	12		2026-03-04 14:16:53.931811+00	0
4	5	2026-02-23	10		2026-03-04 14:17:09.37439+00	0
5	5	2026-02-26	24		2026-03-04 14:17:37.154181+00	0
6	5	2026-02-27	16		2026-03-04 14:17:47.538355+00	0
7	5	2026-03-02	175	Accidental Case	2026-03-04 14:18:08.716509+00	0
8	4	2026-02-12	5		2026-03-04 14:20:21.487976+00	0
9	4	2026-02-15	16		2026-03-04 14:20:38.439572+00	0
10	4	2026-02-17	4		2026-03-04 14:20:53.910065+00	0
11	4	2026-02-19	4		2026-03-04 14:21:10.567726+00	0
12	4	2026-02-22	7		2026-03-04 14:21:22.017848+00	0
13	4	2026-02-24	6		2026-03-04 14:21:35.628037+00	0
14	4	2026-02-26	3		2026-03-04 14:22:41.934663+00	0
15	4	2026-02-28	4		2026-03-04 14:23:09.269896+00	0
16	4	2026-03-02	3		2026-03-04 14:23:23.322459+00	0
17	3	2026-02-10	104		2026-03-04 14:24:11.873274+00	0
18	3	2026-02-12	26		2026-03-04 14:24:19.831345+00	0
19	3	2026-02-15	25		2026-03-04 14:24:30.561169+00	0
20	3	2026-02-17	16		2026-03-04 14:24:41.757975+00	0
21	3	2026-02-19	19		2026-03-04 14:24:51.860336+00	0
22	3	2026-02-21	9		2026-03-04 14:25:01.75135+00	0
23	3	2026-02-22	15		2026-03-04 14:25:14.750512+00	0
24	3	2026-02-24	6		2026-03-04 14:32:07.747354+00	0
25	3	2026-02-28	6		2026-03-04 14:32:23.75561+00	0
26	3	2026-03-02	8		2026-03-04 14:32:34.078156+00	0
27	1	2026-01-31	13		2026-03-04 15:00:54.347574+00	0
28	1	2026-02-05	5		2026-03-04 15:01:05.38705+00	0
29	1	2026-02-10	6		2026-03-04 15:01:16.871771+00	0
30	1	2026-02-12	4		2026-03-04 15:01:30.181744+00	0
31	1	2026-02-15	3		2026-03-04 15:01:46.347985+00	0
32	1	2026-02-17	2		2026-03-04 15:01:58.797789+00	0
33	1	2026-02-19	1		2026-03-04 15:02:19.131601+00	0
34	1	2026-02-22	1		2026-03-04 15:02:30.283442+00	0
35	1	2026-02-24	2		2026-03-04 15:02:47.139605+00	0
36	1	2026-02-28	4		2026-03-04 15:03:03.686656+00	0
37	1	2026-03-02	1		2026-03-04 15:03:15.481106+00	0
38	2	2026-01-31	6		2026-03-04 15:08:40.570091+00	0
39	2	2026-02-03	16		2026-03-04 15:08:49.98752+00	0
40	2	2026-03-05	1		2026-03-04 15:08:59.667353+00	0
41	2	2026-02-10	5		2026-03-04 15:09:11.849553+00	0
42	2	2026-02-12	2		2026-03-04 15:09:56.510024+00	0
43	2	2026-02-15	3		2026-03-04 15:10:12.282568+00	0
44	2	2026-02-17	2		2026-03-04 15:10:24.856712+00	0
45	2	2026-02-19	2		2026-03-04 15:10:30.994367+00	0
46	2	2026-02-22	6		2026-03-04 15:10:45.919156+00	0
47	2	2026-02-24	2		2026-03-04 15:11:00.583326+00	0
48	2	2026-02-26	3		2026-03-04 15:11:28.666118+00	0
49	2	2026-02-28	6		2026-03-04 15:11:43.63166+00	0
50	2	2026-03-02	7		2026-03-04 15:12:07.503291+00	0
51	2	2026-03-04	8		2026-03-08 04:53:14.394813+00	0
52	2	2026-03-07	23		2026-03-08 04:53:24.504526+00	0
53	2	2026-03-08	8		2026-03-08 04:53:40.902659+00	0
54	2	2026-03-09	1		2026-03-10 05:42:23.323736+00	0
55	4	2026-03-05	8		2026-03-11 10:51:55.36084+00	0
56	4	2026-03-07	6		2026-03-11 10:52:04.887222+00	0
57	4	2026-03-11	2		2026-03-11 10:52:13.558461+00	0
58	8	2026-03-01	10		2026-03-11 10:54:13.021457+00	0
59	8	2026-03-02	8		2026-03-11 10:54:28.611537+00	0
60	8	2026-03-07	28		2026-03-11 10:54:38.589051+00	0
61	8	2026-03-09	1		2026-03-11 10:54:47.913477+00	0
62	8	2026-03-11	10		2026-03-11 10:54:52.842136+00	0
63	5	2026-03-07	12		2026-03-11 10:55:40.903286+00	0
64	5	2026-03-10	9		2026-03-11 10:55:52.853622+00	0
65	6	2026-02-23	52		2026-03-11 10:56:39.876075+00	0
66	6	2026-02-27	184		2026-03-11 10:56:58.768021+00	0
67	6	2026-03-02	39		2026-03-11 10:57:09.484251+00	0
68	6	2026-03-07	5		2026-03-11 10:57:19.126161+00	0
69	6	2026-03-10	12		2026-03-11 10:57:41.507531+00	0
70	3	2026-03-07	12		2026-03-11 10:59:22.763596+00	0
71	3	2026-03-08	5		2026-03-11 10:59:35.279956+00	0
72	3	2026-03-11	15		2026-03-11 10:59:41.52503+00	0
73	7	2026-03-11	75	BATCH CLOSED	2026-03-11 11:10:20.876183+00	0
74	1	2026-03-07	14		2026-03-12 05:46:45.204759+00	0
75	1	2026-03-08	2		2026-03-12 05:46:53.661114+00	0
76	1	2026-03-09	2		2026-03-12 05:47:05.111562+00	0
77	1	2026-03-10	3		2026-03-12 05:47:20.037582+00	0
78	9	2026-03-09	8		2026-03-12 13:34:32.355968+00	0
79	9	2026-03-10	2		2026-03-12 13:34:43.834898+00	0
80	9	2026-03-12	10		2026-03-12 13:34:50.137656+00	0
81	6	2026-03-12	1		2026-03-12 13:37:48.918545+00	0
82	5	2026-03-12	2		2026-03-12 13:38:16.187788+00	0
83	9	2026-03-14	50		2026-03-14 11:51:33.923468+00	0
84	6	2026-03-14	4		2026-03-14 12:41:37.13806+00	0
85	5	2026-03-14	6		2026-03-14 13:00:44.392904+00	0
86	8	2026-03-13	6		2026-03-16 07:11:53.438328+00	0
87	8	2026-03-16	9		2026-03-16 07:12:12.739366+00	0
88	4	2026-03-13	4		2026-03-16 07:12:52.428823+00	0
89	4	2026-03-16	10		2026-03-16 07:12:57.326654+00	0
90	10	2026-03-16	13		2026-03-16 07:13:34.697784+00	0
91	3	2026-03-13	15		2026-03-16 09:58:38.339601+00	0
92	3	2026-03-16	15		2026-03-16 09:59:06.129164+00	0
93	9	2026-03-17	46		2026-03-17 11:35:20.080287+00	0
94	6	2026-03-17	16		2026-03-17 11:36:08.244497+00	0
95	5	2026-03-17	7		2026-03-17 15:12:41.24943+00	0
96	10	2026-03-21	4		2026-03-21 03:55:57.157455+00	0
97	8	2026-03-21	5		2026-03-21 03:56:30.92347+00	0
98	6	2026-03-22	3		2026-03-22 11:08:04.898028+00	0
99	5	2026-03-19	6		2026-03-22 11:08:45.419763+00	0
100	5	2026-03-22	19		2026-03-22 11:08:53.547304+00	0
101	12	2026-03-20	6		2026-03-22 14:27:29.582476+00	0
102	4	2026-03-18	17		2026-03-23 09:41:36.620416+00	0
103	4	2026-03-20	31		2026-03-23 09:41:47.46128+00	0
104	3	2026-03-18	14		2026-03-23 11:29:58.225276+00	0
105	3	2026-03-19	17		2026-03-23 11:30:12.859955+00	0
106	3	2026-03-20	12		2026-03-23 11:30:20.431812+00	0
107	3	2026-03-20	15		2026-03-23 11:31:04.691984+00	0
108	12	2026-03-24	11		2026-03-24 05:39:20.046022+00	0
109	11	2026-03-20	7		2026-03-24 12:54:02.119137+00	0
110	11	2026-03-24	12		2026-03-24 12:54:10.848736+00	0
111	10	2026-03-18	2		2026-03-24 12:55:38.520461+00	0
112	10	2026-03-24	21		2026-03-24 12:55:53.652406+00	0
113	12	2026-03-26	1		2026-03-26 06:50:44.574036+00	0
114	13	2026-03-24	17		2026-03-26 12:20:47.808495+00	0
115	13	2026-03-26	6		2026-03-26 12:20:54.488373+00	0
116	11	2026-03-26	8		2026-03-26 12:22:50.297739+00	0
117	14	2026-03-26	6		2026-03-26 12:24:48.210666+00	0
118	15	2026-03-28	2		2026-03-28 06:00:47.889876+00	0
119	12	2026-03-28	3		2026-03-28 06:01:47.424691+00	0
120	6	2026-03-25	3		2026-03-28 06:02:21.251209+00	0
121	6	2026-03-28	5		2026-03-28 06:02:26.008985+00	0
122	9	2026-03-19	10		2026-03-28 06:03:14.878414+00	0
123	9	2026-03-22	17		2026-03-28 06:03:27.227927+00	0
124	9	2026-03-25	13		2026-03-28 06:03:37.560107+00	0
125	9	2026-03-27	7		2026-03-28 06:03:49.446658+00	0
126	5	2026-03-30	106		2026-03-30 14:16:13.646609+00	0
127	8	2026-03-24	10		2026-04-08 14:29:21.949307+00	0
128	8	2026-03-26	4		2026-04-08 14:29:32.899171+00	0
129	8	2026-03-28	9		2026-04-08 14:29:54.717587+00	0
130	8	2026-03-31	8		2026-04-08 14:30:10.56204+00	0
131	8	2026-04-05	42		2026-04-08 14:30:53.664397+00	0
132	9	2026-03-30	4		2026-04-20 10:29:10.982289+00	0
133	9	2026-04-01	18		2026-04-20 10:29:32.195948+00	0
134	9	2026-04-03	17		2026-04-20 10:29:59.271183+00	0
135	9	2026-04-06	15		2026-04-20 10:30:34.355423+00	0
136	9	2026-04-09	36		2026-04-20 10:30:51.240252+00	0
137	9	2026-04-10	8		2026-04-20 10:31:11.564786+00	0
138	9	2026-04-11	18		2026-04-20 10:31:30.459125+00	0
139	9	2026-04-12	8		2026-04-20 10:31:43.430946+00	0
140	9	2026-04-13	13		2026-04-20 10:31:59.775356+00	0
141	20	2026-04-15	12		2026-04-20 11:36:10.111884+00	0
142	10	2026-03-26	15		2026-04-24 06:56:32.089558+00	0
143	10	2026-03-28	4		2026-04-24 06:57:12.197145+00	0
144	10	2026-03-31	1		2026-04-24 06:57:29.701214+00	0
145	10	2026-04-04	10		2026-04-24 06:57:44.32446+00	0
146	10	2026-04-07	1		2026-04-24 06:57:51.796833+00	0
147	10	2026-04-10	4		2026-04-24 06:58:06.836339+00	0
148	10	2026-04-12	6		2026-04-24 06:58:21.158891+00	0
149	10	2026-04-14	4		2026-04-24 06:58:29.850522+00	0
150	10	2026-04-16	15		2026-04-24 06:59:14.669905+00	0
151	10	2026-04-18	49		2026-04-24 06:59:34.323813+00	0
152	10	2026-04-19	8		2026-04-24 07:00:12.698024+00	0
153	13	2026-03-28	2		2026-04-25 02:15:39.082198+00	0
154	13	2026-03-31	8		2026-04-25 02:15:52.890938+00	0
155	13	2026-04-04	32		2026-04-25 02:16:05.76839+00	0
156	13	2026-04-07	10		2026-04-25 02:16:20.007282+00	0
157	13	2026-04-10	3		2026-04-25 02:16:34.671336+00	0
158	13	2026-04-12	1		2026-04-25 02:16:47.997615+00	0
159	13	2026-04-14	8		2026-04-25 02:16:54.119519+00	0
160	13	2026-04-16	7		2026-04-25 02:17:18.992742+00	0
161	13	2026-04-18	23		2026-04-25 02:17:29.020432+00	0
162	13	2026-04-19	12		2026-04-25 02:17:43.454981+00	0
163	13	2026-04-20	4		2026-04-25 02:18:19.621081+00	0
164	13	2026-04-18	12		2026-04-25 02:18:56.236223+00	0
165	19	2026-04-15	5		2026-04-25 02:33:05.620696+00	0
166	19	2026-04-17	15		2026-04-25 02:33:14.221283+00	0
167	19	2026-04-20	5		2026-04-25 02:33:21.178527+00	0
168	19	2026-04-22	10		2026-04-25 02:33:39.732202+00	0
169	19	2026-04-23	3		2026-04-25 02:33:47.236903+00	0
170	19	2026-04-24	4		2026-04-25 02:33:56.917442+00	0
171	21	2026-04-23	8		2026-04-25 02:34:34.103476+00	0
172	21	2026-04-24	5		2026-04-25 02:34:48.820616+00	0
173	17	2026-04-04	5		2026-04-25 02:35:46.564608+00	0
174	17	2026-04-07	9		2026-04-25 02:35:57.524433+00	0
175	17	2026-04-10	7		2026-04-25 02:36:10.009959+00	0
176	17	2026-04-14	12		2026-04-25 02:36:19.062294+00	0
177	17	2026-04-16	12		2026-04-25 02:36:25.659308+00	0
178	17	2026-04-17	2		2026-04-25 02:36:48.792408+00	0
179	17	2026-04-20	17		2026-04-25 02:36:55.749568+00	0
180	17	2026-04-22	4		2026-04-25 02:37:02.734294+00	0
181	16	2026-03-28	4		2026-04-25 02:37:32.128574+00	0
182	16	2026-03-31	13		2026-04-25 02:37:41.102126+00	0
183	16	2026-04-04	24		2026-04-25 02:37:52.720772+00	0
184	16	2026-04-07	15		2026-04-25 02:38:03.164208+00	0
185	16	2026-04-10	10		2026-04-25 02:38:20.247431+00	0
186	16	2026-04-12	6		2026-04-25 02:39:07.440775+00	0
187	16	2026-04-14	10		2026-04-25 02:39:16.037993+00	0
188	16	2026-04-16	9		2026-04-25 02:39:25.681825+00	0
189	16	2026-04-18	9		2026-04-25 02:39:34.384827+00	0
190	16	2026-04-20	8		2026-04-25 02:39:43.901544+00	0
191	16	2026-04-22	8		2026-04-25 02:39:52.826287+00	0
192	12	2026-03-31	3		2026-05-13 05:05:29.995448+00	0
193	12	2026-04-02	1		2026-05-13 05:05:52.690311+00	0
194	12	2026-04-06	2		2026-05-13 05:06:01.933146+00	0
195	12	2026-04-13	8		2026-05-13 05:06:12.31693+00	0
196	12	2026-04-16	3		2026-05-13 05:06:25.05651+00	0
197	12	2026-04-17	2		2026-05-13 05:06:34.983454+00	0
198	12	2026-04-19	5		2026-05-13 05:06:47.2526+00	0
199	12	2026-04-21	2		2026-05-13 05:06:58.529612+00	0
200	12	2026-04-22	4		2026-05-13 05:07:07.087185+00	0
201	12	2026-04-23	4		2026-05-13 05:07:29.966026+00	0
202	12	2026-04-24	9		2026-05-13 05:07:40.28829+00	0
203	12	2026-04-26	4		2026-05-13 05:08:14.733973+00	0
204	11	2026-03-28	10		2026-05-13 05:24:52.083533+00	0
205	11	2026-03-31	12		2026-05-13 05:25:06.447834+00	0
206	11	2026-04-04	21		2026-05-13 05:25:22.885563+00	0
207	11	2026-04-07	1		2026-05-13 05:25:34.063266+00	0
208	11	2026-04-10	5		2026-05-13 05:25:48.253314+00	0
209	11	2026-04-12	9		2026-05-13 05:26:05.611312+00	0
210	11	2026-04-14	11		2026-05-13 05:26:12.758433+00	0
211	11	2026-04-16	23		2026-05-13 05:26:34.448965+00	0
212	11	2026-04-18	31		2026-05-13 05:26:54.242137+00	0
213	11	2026-04-20	14		2026-05-13 05:27:11.827217+00	0
214	11	2026-04-25	79		2026-06-22 14:34:30.290517+00	0
215	14	2026-05-02	132		2026-06-22 14:43:56.101223+00	0
216	16	2026-05-04	81		2026-06-22 14:54:44.286672+00	0
217	15	2026-05-04	150		2026-06-22 15:00:08.344769+00	0
218	17	2026-05-11	46		2026-06-22 15:03:46.325286+00	0
219	18	2026-05-18	316		2026-06-22 15:07:35.688927+00	0
220	20	2026-05-17	939		2026-06-22 15:11:12.429253+00	0
221	19	2026-05-24	550		2026-06-22 15:14:43.296001+00	0
222	21	2026-05-27	177		2026-06-23 11:13:46.441238+00	0
223	22	2026-06-03	190		2026-06-23 13:24:53.124559+00	0
224	23	2026-06-08	352		2026-06-23 13:35:13.258203+00	0
225	24	2026-05-29	490		2026-06-24 12:11:05.627336+00	0
226	25	2026-06-09	256		2026-06-24 12:25:16.609267+00	0
227	26	2026-06-03	1		2026-06-30 14:22:52.66792+00	0
228	26	2026-06-14	258		2026-06-30 14:25:20.024554+00	0
229	27	2026-06-19	124		2026-06-30 14:32:11.854792+00	0
230	37	2026-08-18	100		2026-08-18 06:56:16.694754+00	0
231	38	2026-08-18	100		2026-08-18 14:10:21.150292+00	0
232	39	2026-08-31	0	1000 birds added on 2026-08-31 (Allocation #177)	2026-08-31 05:45:03.802637+00	1000
233	39	2026-08-31	10		2026-08-31 05:48:02.392595+00	0
234	40	2026-09-04	10		2026-09-04 11:11:06.258678+00	0
\.


--
-- Data for Name: bird_sell_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bird_sell_history (sale_id, batch_id, trader_id, sale_date, quantity_sold, price_per_bird, total_amount, notes, created_at) FROM stdin;
\.


--
-- Data for Name: farmer_commission_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.farmer_commission_history (id, farmer_id, commission_amount, description, created_at) FROM stdin;
1	2	50891.00	GOOD	2026-03-11 09:53:22.215986+00
3	4	43537.00	GC	2026-03-24 05:42:36.451337+00
4	3	20038.00	GC	2026-03-24 05:43:10.090399+00
\.


--
-- Data for Name: farmers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.farmers (farmer_id, name, phone_number, address, bank_account_no, bank_name, ifsc_code, area_size, created_at) FROM stdin;
1	Jagrit Ray	8447466162	Keshobari	TBA	TBA	TBA	1.00	2026-03-03 04:56:38.843987+00
2	Umesh Singh	8924914318	Keshobari	TBA	TBA	TBA	1.00	2026-03-03 04:57:39.996561+00
3	Manteshwer Pandey	9721505087	panday Bhanoli Nagar	TBA	TBA	TBA	1.00	2026-03-03 05:01:59.334684+00
4	Rampravesh Yadav	9026932325	Harangpur,Sirjam	TBA	TBA	TBA	1.00	2026-03-03 05:03:08.078342+00
5	Mukesh Singh	9696128871	Vishwa	TBA	TBA	TBA	1.00	2026-03-03 05:04:11.516561+00
6	Suryansh Singh	8957069578	Sirisiya	TBA	TBA	TBA	1.00	2026-03-03 05:05:18.127991+00
7	Dwarika Patel	9506866394	Chheriha	TBA	TBA	TBA	1.00	2026-03-03 05:06:28.242411+00
8	Deepak Yadav	9026932326	Motipakar,Hata	TBA	TBA	TBA	1.00	2026-03-03 10:07:24.917167+00
9	RAKESH RAO	8009260093	HARPUR	TBA	TBA	TBA	1.00	2026-03-11 12:28:08.700072+00
10	Gyatri Devi	6306016044	TBA	TBA	TBA	TBA	1.00	2026-03-14 08:39:20.038576+00
11	PRINCE SINGH	9005840880	Gulhariy,Sohasa	tba	tba	tba	1.00	2026-03-18 05:32:33.103647+00
12	Arjun Singh	7054197951	Dumri,Swangi Pati	TBA	TBA	TBA	1.00	2026-03-22 14:23:30.161575+00
13	HARINATH PRAJAPATI	87381671	HATA	TBA	TBA	TBA	1.00	2026-03-30 14:01:05.224668+00
14	RANJEET SINGH	133231313	TBA	TBA	TBA	TBA	1.00	2026-04-20 11:35:07.74114+00
15	BIRENDRA SINGH	829972	tba	tba	tba	tba	1.00	2026-04-25 02:29:13.009638+00
16	Sikendra Prasad	918187272	bdsdb	TBA	TBA	TBA	1.00	2026-06-23 11:37:43.78593+00
17	Raj Kumar Bharti	888137163	tba	tba	tba	tba	1.00	2026-06-23 11:41:11.296025+00
18	SANTHOSH SINGH	863163	TBA	TBA	TBA	TBA	1.00	2026-06-30 14:29:48.758955+00
19	T-1 SINGH	86186383	N/A	1313	DNJAS	JW12	1.00	2026-08-17 03:53:47.779052+00
20	BANDAR	17361631	HI	NA	NA	NA	1.00	2026-08-31 05:28:08.841811+00
\.


--
-- Data for Name: farms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.farms (farm_id, farmer_id, code, name, video_url, gmaps_url, created_at, location) FROM stdin;
4	19	FARM-001	SINGH	www.c.com	www.c.com	2026-08-18 07:02:14.969012+00	Singh Farm Lane, Village Mohali, Punjab
3	1	TRADE-001	Trader Test Farm	https://v.example.com/t	https://maps.example.com/t	2026-08-03 20:37:26.777675+00	Test Farm Road, District Centre, Punjab
5	20	RJ-001	BANDAR	N/A	N/A	2026-08-31 05:42:14.859523+00	PIPRA
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory (inventory_id, item_code, current_qty, last_updated) FROM stdin;
6	DC101	0.00	2026-01-08 18:08:12.411269+00
7	FD104	1274.00	2026-08-19 18:04:58.619384+00
5	MD101	30.00	2026-08-21 15:06:47.221346+00
4	FD103	230.00	2026-08-21 16:08:40.986435+00
3	SC101	0.00	2026-08-31 05:45:03.79875+00
1	FD101	341.00	2026-08-31 05:47:13.985903+00
2	FD102	1588.00	2026-09-04 11:09:40.090942+00
\.


--
-- Data for Name: inventory_movements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_movements (movement_id, item_code, qty_change, movement_type, reference_id, movement_date) FROM stdin;
1	SC101	1530.00	purchase	1	2026-03-03 05:11:13.045839+00
2	SC101	-1530.00	allocation	1	2026-03-03 05:12:23.146114+00
3	SC101	2238.00	purchase	2	2026-03-03 05:17:49.529076+00
4	SC101	-2238.00	allocation	2	2026-03-03 05:18:19.743364+00
5	SC101	3541.00	purchase	3	2026-03-03 05:19:58.380444+00
6	SC101	-3541.00	allocation	3	2026-03-03 05:20:27.338104+00
7	SC101	2550.00	purchase	4	2026-03-03 05:32:52.973355+00
8	SC101	-2550.00	allocation	4	2026-03-03 05:33:38.301832+00
9	SC101	2295.00	purchase	5	2026-03-03 09:46:46.140737+00
10	SC101	-2295.00	allocation	5	2026-03-03 09:47:16.389184+00
11	SC101	3468.00	purchase	6	2026-03-03 09:50:02.877873+00
12	SC101	-3468.00	allocation	6	2026-03-03 09:50:36.038719+00
13	SC101	1989.00	purchase	7	2026-03-03 10:10:08.05244+00
14	SC101	-1989.00	allocation	7	2026-03-03 10:10:37.072039+00
15	FD102	100.00	purchase	8	2026-03-04 05:17:37.169412+00
16	FD101	77.00	purchase	9	2026-03-04 05:18:30.039787+00
17	FD101	-20.00	allocation	8	2026-03-04 05:25:00.434393+00
18	FD101	-30.00	allocation	9	2026-03-04 05:25:05.363974+00
19	FD102	-40.00	allocation	10	2026-03-04 05:25:08.606743+00
20	FD101	125.00	purchase	10	2026-03-04 05:36:00.871821+00
21	FD102	207.00	purchase	11	2026-03-04 05:36:38.894194+00
22	FD101	-10.00	allocation	11	2026-03-04 05:37:13.60997+00
23	FD101	-20.00	allocation	12	2026-03-04 05:37:23.8029+00
24	FD102	-100.00	allocation	13	2026-03-04 05:37:34.429964+00
25	FD101	-18.00	allocation	14	2026-03-04 05:37:49.77078+00
26	FD102	-80.00	allocation	15	2026-03-04 05:37:56.218559+00
27	FD101	-35.00	allocation	16	2026-03-04 05:38:00.69054+00
28	FD102	-55.00	allocation	17	2026-03-04 05:38:04.312625+00
29	FD101	-22.00	allocation	18	2026-03-04 05:38:07.432648+00
30	FD102	-30.00	allocation	19	2026-03-04 05:38:12.688895+00
31	FD102	29.00	purchase	12	2026-03-04 05:43:37.87968+00
32	SC101	2805.00	purchase	13	2026-03-04 10:02:32.39733+00
33	SC101	-2805.00	allocation	8	2026-03-04 10:08:47.891366+00
34	FD101	-20.00	allocation	21	2026-03-04 10:09:58.892271+00
35	FD102	120.00	purchase	14	2026-03-04 10:28:58.994381+00
36	FD101	38.00	purchase	15	2026-03-04 10:40:21.017717+00
37	FD102	2.00	purchase	16	2026-03-04 10:41:36.282778+00
38	FD103	20.00	purchase	17	2026-03-04 10:44:10.183266+00
39	FD104	180.00	purchase	18	2026-03-04 10:49:17.737794+00
40	FD102	30.00	purchase	19	2026-03-06 18:06:44.452862+00
41	FD103	30.00	purchase	20	2026-03-06 18:07:18.325839+00
42	FD102	200.00	purchase	21	2026-03-06 18:08:21.628659+00
48	FD102	60.00	purchase	25	2026-03-10 12:28:37.139676+00
49	FD104	60.00	purchase	26	2026-03-10 12:30:42.113817+00
51	FD102	-32.00	allocation	25	2026-03-11 09:22:18.358499+00
52	FD102	-69.00	allocation	26	2026-03-11 09:23:45.228207+00
53	FD102	-62.00	allocation	27	2026-03-11 09:25:27.903219+00
54	FD102	-74.00	allocation	28	2026-03-11 09:26:22.753019+00
55	FD101	5.00	adjustment	1	2026-03-11 09:38:58.735139+00
56	FD102	-104.00	allocation	29	2026-03-11 09:41:56.945846+00
57	FD101	-5.00	allocation	30	2026-03-11 09:44:29.446683+00
58	FD104	200.00	purchase	27	2026-03-11 09:45:46.858481+00
59	FD104	60.00	purchase	28	2026-03-11 09:46:14.755474+00
60	FD102	-1.00	allocation	31	2026-03-11 11:04:48.46846+00
61	MD101	10.00	purchase	29	2026-03-11 11:06:11.783573+00
62	MD101	-10.00	allocation	32	2026-03-11 11:06:53.041492+00
63	FD101	2.00	adjustment	2	2026-03-12 05:42:02.545765+00
64	FD102	10.00	adjustment	3	2026-03-12 05:43:36.453006+00
65	FD103	-10.00	allocation	33	2026-03-12 05:44:03.219022+00
66	FD103	-2.00	allocation	34	2026-03-12 05:45:02.829302+00
67	MD101	10.00	purchase	30	2026-03-12 05:45:38.314893+00
68	MD101	-10.00	allocation	35	2026-03-12 05:46:00.348678+00
69	FD103	60.00	purchase	31	2026-03-12 09:51:19.008903+00
70	FD104	60.00	purchase	32	2026-03-12 09:52:49.49377+00
71	SC101	1931.00	purchase	33	2026-03-12 13:33:35.636932+00
72	SC101	-1931.00	allocation	9	2026-03-12 13:34:10.665684+00
73	FD101	-12.00	allocation	37	2026-03-12 13:35:30.731939+00
74	FD102	25.00	purchase	34	2026-03-14 06:32:08.331309+00
75	FD103	35.00	purchase	35	2026-03-14 06:33:43.171116+00
76	FD104	60.00	purchase	36	2026-03-14 06:34:56.525618+00
77	SC101	3162.00	purchase	37	2026-03-14 08:36:40.610418+00
78	SC101	-3162.00	allocation	10	2026-03-14 08:39:54.127042+00
79	FD101	-30.00	allocation	39	2026-03-16 15:26:38.547246+00
80	SC101	2344.00	purchase	38	2026-03-18 05:30:08.871288+00
81	SC101	-2344.00	allocation	11	2026-03-18 05:33:19.458203+00
82	FD101	23.00	purchase	39	2026-03-19 07:33:51.020322+00
84	FD103	35.00	purchase	41	2026-03-19 07:35:57.629379+00
85	FD102	2.00	purchase	42	2026-03-19 07:37:13.726218+00
88	FD104	60.00	purchase	45	2026-03-19 08:57:14.228777+00
89	FD104	60.00	purchase	46	2026-03-19 08:58:22.888407+00
90	MD101	20.00	purchase	47	2026-03-19 09:05:37.505591+00
91	FD101	50.00	purchase	48	2026-03-20 08:07:20.186064+00
93	FD102	100.00	purchase	50	2026-03-20 08:10:24.610735+00
94	FD103	100.00	purchase	51	2026-03-20 08:11:42.914874+00
95	FD104	60.00	purchase	52	2026-03-20 08:12:39.993188+00
96	FD104	200.00	purchase	53	2026-03-20 08:14:16.174513+00
97	FD102	10.00	purchase	54	2026-03-20 16:48:20.449557+00
98	SC101	1428.00	purchase	55	2026-03-22 14:25:36.811595+00
99	SC101	-1428.00	allocation	12	2026-03-22 14:26:11.055377+00
100	FD101	-10.00	allocation	42	2026-03-22 14:27:03.574909+00
101	FD103	-53.00	allocation	43	2026-03-23 09:39:19.966677+00
102	FD104	-179.00	allocation	44	2026-03-23 09:39:44.433836+00
103	FD102	-71.00	allocation	45	2026-03-23 11:28:23.735859+00
104	FD103	-60.00	allocation	46	2026-03-23 11:28:27.031953+00
105	FD104	-216.00	allocation	47	2026-03-23 11:28:42.132628+00
106	FD102	-40.00	allocation	48	2026-03-24 12:54:56.685526+00
107	FD102	-25.00	allocation	49	2026-03-24 12:57:29.614191+00
108	FD102	60.00	purchase	56	2026-03-25 04:25:45.162074+00
109	SC101	1922.00	purchase	57	2026-03-26 12:18:06.866615+00
110	SC101	-1922.00	allocation	13	2026-03-26 12:20:30.156527+00
111	FD101	-27.00	allocation	51	2026-03-26 12:22:06.32077+00
112	SC101	1422.00	purchase	58	2026-03-26 12:23:57.979464+00
113	SC101	-1422.00	allocation	14	2026-03-26 12:24:30.215714+00
114	FD101	-13.00	allocation	53	2026-03-26 12:25:23.919267+00
115	SC101	2025.00	purchase	59	2026-03-28 05:59:42.628554+00
116	SC101	-2025.00	allocation	15	2026-03-28 05:59:58.496156+00
117	FD101	-20.00	allocation	55	2026-03-28 06:00:33.337426+00
118	FD101	60.00	purchase	60	2026-03-28 06:52:05.967483+00
119	FD104	60.00	purchase	61	2026-03-28 06:53:02.697976+00
120	FD102	60.00	purchase	62	2026-03-30 05:08:17.497262+00
121	FD104	60.00	purchase	63	2026-03-30 05:08:45.801067+00
122	FD101	-23.00	allocation	56	2026-03-30 08:40:05.253064+00
123	FD102	-27.00	allocation	57	2026-03-30 08:40:19.355113+00
124	FD102	-40.00	allocation	58	2026-03-30 08:41:13.157067+00
125	FD101	-5.00	allocation	59	2026-03-30 08:44:59.890601+00
126	FD102	-75.00	allocation	60	2026-03-30 08:45:03.365406+00
127	FD102	-35.00	allocation	61	2026-03-30 08:46:13.993851+00
128	FD103	-63.00	allocation	62	2026-03-30 08:46:15.968463+00
129	FD103	-75.00	allocation	63	2026-03-30 08:48:17.224488+00
130	FD101	10.00	adjustment	4	2026-03-30 13:48:01.497482+00
131	FD102	-10.00	allocation	64	2026-03-30 13:48:41.404469+00
133	SC101	3718.00	purchase	64	2026-03-30 14:04:31.78967+00
134	SC101	-3718.00	allocation	16	2026-03-30 14:06:32.154554+00
135	FD102	34.00	purchase	65	2026-03-30 14:09:34.379438+00
136	FD102	-34.00	allocation	67	2026-03-30 14:10:15.34478+00
137	FD103	19.00	purchase	66	2026-03-30 14:11:05.200874+00
138	FD103	-24.00	allocation	68	2026-03-30 14:11:18.947853+00
139	FD104	-150.00	allocation	69	2026-03-30 14:11:56.111162+00
140	MD101	245.00	purchase	67	2026-03-30 14:13:52.403506+00
141	MD101	-10.00	allocation	70	2026-03-30 14:14:03.573563+00
142	FD101	-38.00	allocation	71	2026-03-30 14:27:57.888732+00
143	FD102	38.00	purchase	68	2026-03-30 14:34:17.078335+00
144	FD102	-52.00	allocation	72	2026-03-30 14:38:15.889637+00
145	FD102	50.00	purchase	69	2026-04-02 15:40:21.486186+00
146	FD104	50.00	purchase	70	2026-04-02 15:41:16.185266+00
147	SC101	2244.00	purchase	71	2026-04-03 09:16:26.153431+00
148	SC101	-2244.00	allocation	17	2026-04-03 09:19:12.566654+00
149	FD101	-22.00	allocation	74	2026-04-04 05:17:31.186295+00
150	FD102	60.00	purchase	72	2026-04-04 05:27:18.314988+00
151	FD104	60.00	purchase	73	2026-04-04 05:28:07.236472+00
152	FD102	60.00	purchase	74	2026-04-04 07:06:25.460885+00
153	FD102	60.00	purchase	75	2026-04-04 07:08:09.928064+00
154	FD103	12.00	adjustment	5	2026-04-06 08:29:37.394648+00
155	FD102	-30.00	allocation	75	2026-04-06 08:30:24.053868+00
156	MD101	-1.00	allocation	76	2026-04-06 08:31:20.796408+00
157	MD101	-200.00	allocation	77	2026-04-06 08:31:56.49504+00
158	FD104	-100.00	allocation	78	2026-04-06 08:34:02.16799+00
159	FD104	-50.00	allocation	79	2026-04-06 08:34:39.090066+00
160	MD101	-50.00	allocation	80	2026-04-06 08:35:16.52454+00
161	MD101	-4.00	allocation	81	2026-04-06 08:35:27.706105+00
162	FD101	20.00	purchase	76	2026-04-07 06:16:29.498332+00
163	FD102	40.00	purchase	77	2026-04-07 06:17:47.708099+00
164	FD104	60.00	purchase	78	2026-04-07 06:19:02.413173+00
165	FD103	20.00	adjustment	6	2026-04-08 14:28:40.113732+00
166	FD102	-28.00	allocation	82	2026-04-08 14:28:57.93453+00
167	FD104	-191.00	allocation	83	2026-04-08 14:32:01.720499+00
168	MD101	10.00	purchase	79	2026-04-08 14:33:11.974563+00
170	FD102	60.00	purchase	80	2026-04-09 04:29:41.413319+00
171	FD104	60.00	purchase	81	2026-04-09 04:30:50.225761+00
172	FD101	60.00	purchase	82	2026-04-14 06:38:38.523453+00
173	FD104	60.00	purchase	83	2026-04-14 06:42:34.704507+00
175	FD104	60.00	purchase	85	2026-04-14 06:44:14.859037+00
176	FD102	60.00	purchase	86	2026-04-14 06:56:53.873554+00
177	FD101	17.00	purchase	87	2026-04-15 08:10:44.289037+00
178	FD102	43.00	purchase	88	2026-04-15 08:13:51.089167+00
179	FD104	60.00	purchase	89	2026-04-15 08:14:46.851177+00
180	FD104	60.00	purchase	90	2026-04-15 08:16:32.327469+00
181	FD101	10.00	purchase	91	2026-04-15 08:18:45.673179+00
182	FD102	50.00	purchase	92	2026-04-15 08:19:22.089628+00
183	FD102	60.00	purchase	93	2026-04-16 05:43:41.629979+00
184	FD104	60.00	purchase	94	2026-04-16 05:44:45.267199+00
185	FD101	-27.00	allocation	85	2026-04-20 10:26:16.265066+00
186	MD101	1.00	purchase	95	2026-04-20 10:28:04.846273+00
187	MD101	-1.00	allocation	86	2026-04-20 10:28:17.352507+00
188	FD104	-119.00	allocation	87	2026-04-20 10:32:52.387455+00
189	SC101	3768.00	purchase	96	2026-04-20 11:18:42.666864+00
190	SC101	-3768.00	allocation	18	2026-04-20 11:19:04.76079+00
191	SC101	3468.00	purchase	97	2026-04-20 11:27:48.797191+00
192	SC101	-3468.00	allocation	19	2026-04-20 11:29:16.427981+00
193	SC101	2747.00	purchase	98	2026-04-20 11:34:03.878018+00
194	SC101	-2747.00	allocation	20	2026-04-20 11:35:38.761717+00
195	FD102	60.00	purchase	99	2026-04-23 06:47:37.520806+00
196	FD101	20.00	purchase	100	2026-04-23 06:48:36.497224+00
197	FD102	40.00	purchase	101	2026-04-23 06:49:04.251931+00
198	FD101	15.00	purchase	102	2026-04-23 06:49:52.763359+00
199	FD102	45.00	purchase	103	2026-04-23 06:50:25.126872+00
200	FD102	-120.00	allocation	91	2026-04-24 06:53:37.336147+00
201	MD101	1.00	purchase	104	2026-04-24 06:54:13.529364+00
202	MD101	-1.00	allocation	92	2026-04-24 06:54:35.808401+00
203	FD104	-190.00	allocation	93	2026-04-24 06:55:00.161791+00
204	FD102	-40.00	allocation	94	2026-04-25 02:14:04.993146+00
205	FD102	-30.00	allocation	95	2026-04-25 02:14:08.601648+00
206	FD104	-75.00	allocation	97	2026-04-25 02:14:17.042315+00
207	MD101	1.00	purchase	105	2026-04-25 02:14:47.485392+00
208	MD101	-1.00	allocation	98	2026-04-25 02:14:55.345374+00
209	SC101	1530.00	purchase	106	2026-04-25 02:30:12.829055+00
210	SC101	-1530.00	allocation	21	2026-04-25 02:30:42.07965+00
211	FD102	60.00	purchase	107	2026-04-25 06:11:22.929755+00
212	FD101	28.00	purchase	108	2026-04-25 06:12:17.890691+00
213	FD102	32.00	purchase	109	2026-04-25 06:12:58.376908+00
214	FD104	240.00	purchase	110	2026-04-25 07:31:24.040666+00
215	FD104	360.00	purchase	111	2026-04-29 02:57:48.68078+00
218	FD102	60.00	purchase	114	2026-04-29 02:59:55.6091+00
220	FD102	40.00	purchase	116	2026-04-29 03:01:42.743967+00
221	FD101	20.00	purchase	117	2026-04-29 03:02:34.109624+00
222	FD102	40.00	purchase	118	2026-04-29 03:03:10.96734+00
223	FD102	60.00	purchase	119	2026-04-29 03:04:13.050623+00
224	FD102	-35.00	allocation	100	2026-05-13 05:01:46.84233+00
225	MD101	10.00	purchase	120	2026-05-13 05:02:45.807679+00
226	MD101	-10.00	allocation	101	2026-05-13 05:03:05.311847+00
227	FD104	-85.00	allocation	102	2026-05-13 05:04:14.511469+00
228	FD102	60.00	purchase	121	2026-05-19 16:27:00.227092+00
229	FD102	60.00	purchase	122	2026-05-19 16:29:21.2769+00
230	FD102	60.00	purchase	123	2026-05-19 16:30:15.657052+00
231	FD101	10.00	purchase	124	2026-05-19 16:31:08.681434+00
232	FD102	50.00	purchase	125	2026-05-19 16:31:48.276729+00
233	FD104	240.00	purchase	126	2026-05-19 16:34:01.986081+00
234	FD101	32.00	purchase	127	2026-05-19 16:35:15.154138+00
235	FD102	28.00	purchase	128	2026-05-19 16:36:02.526191+00
237	FD102	60.00	purchase	130	2026-05-19 16:38:56.376895+00
238	FD102	60.00	purchase	131	2026-05-19 16:41:09.736893+00
239	FD101	5.00	purchase	132	2026-05-19 16:41:48.476945+00
240	FD102	55.00	purchase	133	2026-05-19 16:42:32.141353+00
241	FD101	20.00	purchase	134	2026-05-19 16:44:55.521606+00
242	FD102	40.00	purchase	135	2026-05-19 16:45:39.741969+00
243	FD101	5.00	purchase	136	2026-05-19 16:48:36.337004+00
244	FD102	55.00	purchase	137	2026-05-19 16:50:24.671307+00
245	FD101	20.00	purchase	138	2026-05-19 16:53:01.9171+00
246	FD102	40.00	purchase	139	2026-05-19 16:54:08.146977+00
247	FD104	420.00	purchase	140	2026-05-19 17:18:24.835853+00
248	FD102	60.00	purchase	141	2026-05-19 18:05:49.626764+00
250	FD101	25.00	purchase	143	2026-05-19 18:07:46.656751+00
251	FD102	35.00	purchase	144	2026-05-19 18:08:39.876122+00
252	FD102	60.00	purchase	145	2026-05-19 18:09:49.216855+00
253	FD101	11.00	purchase	146	2026-05-19 18:10:39.966679+00
254	FD102	49.00	purchase	147	2026-05-19 18:11:18.075908+00
255	FD104	240.00	purchase	148	2026-05-19 18:12:08.19148+00
257	FD102	60.00	purchase	150	2026-06-02 17:24:10.923478+00
258	FD102	60.00	purchase	151	2026-06-02 17:25:37.315474+00
259	FD101	30.00	purchase	152	2026-06-02 17:48:32.221103+00
260	FD102	30.00	purchase	153	2026-06-02 17:49:27.897096+00
261	FD102	60.00	purchase	154	2026-06-02 17:50:32.599736+00
262	FD101	10.00	purchase	155	2026-06-02 17:53:33.565527+00
263	FD102	50.00	purchase	156	2026-06-02 17:54:14.720839+00
264	FD102	60.00	purchase	157	2026-06-02 17:55:39.827012+00
265	FD104	360.00	purchase	158	2026-06-02 17:57:32.575314+00
266	FD102	60.00	purchase	159	2026-06-08 15:41:11.253422+00
267	FD102	60.00	purchase	160	2026-06-08 15:42:11.200785+00
268	FD101	6.00	purchase	161	2026-06-08 15:42:48.515641+00
269	FD102	54.00	purchase	162	2026-06-08 15:43:55.346084+00
270	FD104	180.00	purchase	163	2026-06-08 15:45:28.525142+00
271	FD101	4.00	purchase	164	2026-06-16 05:10:43.858662+00
272	FD102	56.00	purchase	165	2026-06-16 05:11:33.009541+00
273	FD101	50.00	purchase	166	2026-06-16 05:22:38.528955+00
274	FD102	150.00	purchase	167	2026-06-16 05:23:10.866751+00
275	FD104	60.00	purchase	168	2026-06-16 05:24:33.951672+00
276	FD104	200.00	purchase	169	2026-06-16 05:26:53.814197+00
277	FD102	-75.00	allocation	103	2026-06-22 14:30:51.265042+00
278	MD101	10.00	purchase	170	2026-06-22 14:31:42.304447+00
279	MD101	-10.00	allocation	104	2026-06-22 14:32:01.490825+00
280	FD104	-125.00	allocation	105	2026-06-22 14:32:59.902416+00
281	FD101	-20.00	allocation	106	2026-06-22 14:38:26.279841+00
282	FD102	-48.00	allocation	107	2026-06-22 14:38:51.760627+00
283	MD101	20.00	purchase	171	2026-06-22 14:39:49.505755+00
284	FD104	-81.00	allocation	108	2026-06-22 14:40:05.198327+00
285	MD101	-20.00	allocation	109	2026-06-22 14:40:07.02611+00
286	FD101	20.00	adjustment	7	2026-06-22 14:42:17.837041+00
287	FD102	-20.00	allocation	110	2026-06-22 14:43:17.309546+00
288	FD102	-180.00	allocation	111	2026-06-22 14:52:06.697817+00
289	FD104	-218.00	allocation	112	2026-06-22 14:52:25.539198+00
290	MD101	35.00	purchase	172	2026-06-22 14:53:05.505832+00
291	MD101	-35.00	allocation	113	2026-06-22 14:53:17.205271+00
292	FD102	-105.00	allocation	114	2026-06-22 14:57:49.63509+00
298	MD101	10.00	purchase	174	2026-06-22 15:02:51.968217+00
302	FD104	-229.00	allocation	122	2026-06-22 15:06:10.771749+00
293	FD104	-125.00	allocation	115	2026-06-22 14:57:51.087647+00
294	MD101	20.00	purchase	173	2026-06-22 14:58:19.928986+00
295	MD101	-20.00	allocation	116	2026-06-22 14:58:30.773917+00
296	FD102	-107.00	allocation	117	2026-06-22 15:02:16.828991+00
297	FD104	-129.00	allocation	118	2026-06-22 15:02:24.816151+00
299	MD101	-10.00	allocation	119	2026-06-22 15:03:03.646309+00
300	FD101	-37.00	allocation	120	2026-06-22 15:05:44.101969+00
301	FD102	-192.00	allocation	121	2026-06-22 15:06:01.301804+00
303	MD101	35.00	purchase	175	2026-06-22 15:06:43.708271+00
304	MD101	-35.00	allocation	123	2026-06-22 15:06:54.014017+00
305	FD101	-27.00	allocation	124	2026-06-22 15:09:21.443265+00
306	FD102	-60.00	allocation	125	2026-06-22 15:09:31.536087+00
307	FD104	-87.00	allocation	126	2026-06-22 15:09:42.291283+00
308	MD101	10.00	purchase	176	2026-06-22 15:10:09.57211+00
309	MD101	-10.00	allocation	127	2026-06-22 15:10:19.15753+00
310	FD101	-33.00	allocation	128	2026-06-22 15:12:44.055186+00
311	FD102	-160.00	allocation	129	2026-06-22 15:13:04.315945+00
312	FD104	-193.00	allocation	130	2026-06-22 15:13:14.793729+00
313	MD101	20.00	purchase	177	2026-06-22 15:13:51.57907+00
314	MD101	-20.00	allocation	131	2026-06-22 15:14:00.775894+00
315	FD101	-15.00	allocation	132	2026-06-23 11:10:35.417708+00
316	FD102	-75.00	allocation	133	2026-06-23 11:10:49.216194+00
317	MD101	15.00	purchase	178	2026-06-23 11:11:17.933714+00
318	MD101	-15.00	allocation	134	2026-06-23 11:12:19.866744+00
319	FD104	-90.00	allocation	135	2026-06-23 11:13:10.513467+00
320	SC101	1750.00	purchase	179	2026-06-23 11:37:03.645891+00
321	SC101	-1750.00	allocation	22	2026-06-23 11:38:12.802303+00
322	SC101	2805.00	purchase	180	2026-06-23 11:39:56.021127+00
323	SC101	-2805.00	allocation	23	2026-06-23 11:41:36.846145+00
324	FD102	-88.00	allocation	138	2026-06-23 13:19:12.296844+00
325	FD101	-16.00	allocation	139	2026-06-23 13:19:18.405177+00
326	FD104	-104.00	allocation	140	2026-06-23 13:19:47.342492+00
327	MD101	10.00	purchase	181	2026-06-23 13:21:51.017545+00
328	MD101	-10.00	allocation	141	2026-06-23 13:22:20.878187+00
329	FD101	-28.00	allocation	142	2026-06-23 13:29:11.167415+00
330	FD102	-137.00	allocation	143	2026-06-23 13:29:36.925621+00
331	FD104	-165.00	allocation	144	2026-06-23 13:30:27.728587+00
332	FD102	20.00	purchase	182	2026-06-23 13:31:05.750235+00
333	MD101	20.00	purchase	183	2026-06-23 13:32:39.487435+00
334	MD101	-20.00	allocation	146	2026-06-23 13:32:47.579392+00
335	FD101	28.00	purchase	184	2026-06-23 18:04:18.163342+00
337	FD102	32.00	purchase	186	2026-06-23 18:06:16.202849+00
338	FD101	13.00	purchase	187	2026-06-23 18:08:06.135868+00
339	FD102	187.00	purchase	188	2026-06-23 18:10:11.555159+00
340	FD104	100.00	purchase	189	2026-06-23 18:12:41.363986+00
341	SC101	2550.00	purchase	190	2026-06-24 11:59:26.479654+00
342	SC101	-2550.00	allocation	24	2026-06-24 12:00:00.679319+00
343	FD101	-25.00	allocation	148	2026-06-24 12:01:00.849213+00
344	FD102	-118.00	allocation	149	2026-06-24 12:01:13.112149+00
345	FD104	-118.00	allocation	150	2026-06-24 12:03:48.700332+00
346	MD101	20.00	purchase	191	2026-06-24 12:11:37.26017+00
347	MD101	-20.00	allocation	151	2026-06-24 12:11:47.612925+00
348	SC101	3115.00	purchase	192	2026-06-24 12:18:29.481516+00
349	SC101	-3115.00	allocation	25	2026-06-24 12:18:59.78715+00
350	FD101	-30.00	allocation	153	2026-06-24 12:20:44.464985+00
351	FD102	-154.00	allocation	154	2026-06-24 12:21:26.557763+00
352	FD104	-184.00	allocation	155	2026-06-24 12:21:37.319395+00
353	MD101	15.00	purchase	193	2026-06-24 12:23:16.738863+00
354	MD101	-15.00	allocation	156	2026-06-24 12:24:10.395573+00
355	SC101	1479.00	purchase	194	2026-06-24 12:30:16.715512+00
356	SC101	-1479.00	allocation	26	2026-06-24 12:30:34.956942+00
357	FD101	-15.00	allocation	158	2026-06-24 12:30:56.957632+00
358	FD102	-51.00	allocation	159	2026-06-24 12:31:10.955381+00
359	FD104	-66.00	allocation	160	2026-06-24 12:31:21.087776+00
360	MD101	10.00	purchase	195	2026-06-24 12:32:24.387964+00
361	MD101	-10.00	allocation	161	2026-06-24 12:32:34.852776+00
362	SC101	1724.00	purchase	196	2026-06-30 14:28:58.494218+00
363	SC101	-1724.00	allocation	27	2026-06-30 14:30:15.905779+00
364	FD101	-17.00	allocation	163	2026-06-30 14:30:38.628028+00
365	FD102	-89.00	allocation	164	2026-06-30 14:31:02.343654+00
366	FD104	-106.00	allocation	165	2026-06-30 14:32:34.366451+00
367	MD101	50.00	purchase	197	2026-06-30 14:33:19.283335+00
368	MD101	-10.00	allocation	166	2026-06-30 14:33:33.371924+00
370	SC101	2135.00	purchase	199	2026-07-01 05:15:42.577193+00
371	SC101	-2135.00	allocation	28	2026-07-01 05:17:25.22409+00
372	FD101	-20.00	allocation	168	2026-07-01 05:18:12.329209+00
373	FD102	-81.00	allocation	169	2026-07-01 05:18:14.652033+00
374	FD104	-101.00	allocation	170	2026-07-01 05:18:39.055731+00
375	MD101	-10.00	allocation	171	2026-07-01 05:18:52.157998+00
377	FD102	46.00	purchase	201	2026-07-12 18:10:51.46821+00
378	FD101	14.00	purchase	202	2026-07-12 18:12:21.646242+00
380	FD101	23.00	purchase	204	2026-07-12 18:15:48.778974+00
381	FD102	177.00	purchase	205	2026-07-12 18:16:53.219285+00
382	FD101	50.00	purchase	206	2026-07-22 14:54:58.447114+00
383	FD102	150.00	purchase	207	2026-07-22 14:56:06.853648+00
384	FD104	200.00	purchase	208	2026-07-22 14:57:37.58294+00
385	FD101	23.00	purchase	209	2026-07-22 15:02:45.007681+00
386	FD102	37.00	purchase	210	2026-07-22 15:03:43.186159+00
387	FD101	15.00	purchase	211	2026-07-22 15:05:00.245343+00
388	FD102	45.00	purchase	212	2026-07-22 15:05:44.164867+00
389	FD101	5.00	purchase	213	2026-07-26 17:38:12.693106+00
390	FD102	55.00	purchase	214	2026-07-26 17:38:47.153335+00
391	FD101	15.00	purchase	215	2026-07-31 16:57:24.425348+00
392	FD102	45.00	purchase	216	2026-07-31 17:00:06.515935+00
393	FD102	60.00	purchase	217	2026-08-05 18:29:19.499307+00
394	FD101	60.00	purchase	218	2026-08-05 18:30:17.689902+00
395	FD102	140.00	purchase	219	2026-08-05 18:30:54.477072+00
396	SC101	1000.00	purchase	220	2026-08-17 03:51:34.661212+00
397	SC101	-1000.00	allocation	37	2026-08-17 14:03:21.754264+00
398	FD101	-10.00	allocation	173	2026-08-17 14:04:13.311301+00
399	FD102	-10.00	allocation	174	2026-08-18 06:54:52.125876+00
400	FD103	-2.00	allocation	175	2026-08-18 06:55:42.077429+00
401	FD101	-10.00	allocation	176	2026-08-18 14:09:52.528076+00
404	FD102	60.00	purchase	223	2026-08-19 17:50:42.140079+00
405	FD102	20.00	purchase	224	2026-08-19 17:51:21.340414+00
406	FD103	40.00	purchase	225	2026-08-19 17:52:11.726969+00
407	FD103	60.00	purchase	226	2026-08-19 17:53:25.35081+00
408	FD104	300.00	purchase	227	2026-08-19 17:58:17.056087+00
409	FD101	25.00	purchase	228	2026-08-19 17:59:23.083028+00
410	FD102	85.00	purchase	229	2026-08-19 17:59:57.683174+00
411	FD103	90.00	purchase	230	2026-08-19 18:02:38.006371+00
412	FD104	200.00	purchase	231	2026-08-19 18:04:58.617929+00
418	FD101	10.00	purchase	237	2026-08-21 15:11:34.539069+00
419	FD102	10.00	purchase	238	2026-08-21 15:11:34.539069+00
420	FD103	10.00	purchase	239	2026-08-21 16:08:40.979966+00
421	SC101	1000.00	purchase	240	2026-08-31 05:43:47.52301+00
422	SC101	-1000.00	allocation	177	2026-08-31 05:45:03.796062+00
423	FD101	-50.00	allocation	178	2026-08-31 05:47:13.984496+00
424	FD102	-10.00	allocation	179	2026-09-04 11:09:40.084037+00
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.items (item_code, item_name, item_category, unit) FROM stdin;
FD101	PRE-STARTER	feed	bags
FD102	STARTER	feed	bags
MD101	MEDICINE	medicine	set
SC101	SMALL CHICKS	chicks	pcs
DC101	DESI CHICKEN	finished_birds	pcs
FD104	FEED DELIVERY	feed	bags
FD103	DEVELOPER	feed	bags
\.


--
-- Data for Name: ledger_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ledger_accounts (account_id, name, account_type, current_balance, created_at) FROM stdin;
102	inventory-medicine	asset	5000.00	2025-08-28 00:00:00+00
105	liability	liability	10464688.91	2025-08-29 00:00:00+00
104	inventory-chicks	asset	21.83	2025-08-28 00:00:00+00
109	other-expense	expense	0.00	2025-09-20 14:37:29.059606+00
106	commission-farmer	expense	114466.00	2025-08-31 00:00:00+00
111	loan	liability	0.00	2026-03-02 18:02:37.575326+00
112	interest	expense	0.00	2026-03-02 18:03:02.95721+00
103	inventory-feed	asset	4996835.23	2025-08-28 00:00:00+00
107	farm-expense	expense	10846610.60	2025-09-03 00:00:00+00
101	cash	asset	853377.60	2025-08-28 00:00:00+00
110	receivables	asset	8357512.05	2026-01-01 12:28:30.549316+00
108	bird-sales	revenue	11629179.75	2025-09-06 00:00:00+00
\.


--
-- Data for Name: ledger_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ledger_entries (entry_id, account_id, debit, credit, txn_date, reference_table, reference_id, narration, txn_group_id, created_at, created_by) FROM stdin;
1	104	82497.60	\N	2026-03-03	purchases	1	Purchase of 1530 (item SC101)	2cb10331-9e43-477a-9612-4af58e7dad4c	2026-03-03 05:11:13.051593+00	1
2	105	\N	82497.60	2026-03-03	purchases	1	Payment for purchase of 1530 (item SC101)	2cb10331-9e43-477a-9612-4af58e7dad4c	2026-03-03 05:11:13.052707+00	1
3	104	\N	82497.60	2026-03-03	batches	1	Chick allocation for batch 1 - Item: SC101	5a3e1be8-516b-4ef5-8b40-e22b69fe85e5	2026-03-03 05:12:23.149446+00	1
4	107	82497.60	\N	2026-03-03	batches	1	Chick expense for batch 1 - Item: SC101	5a3e1be8-516b-4ef5-8b40-e22b69fe85e5	2026-03-03 05:12:23.150356+00	1
5	104	121008.66	\N	2026-03-03	purchases	2	Purchase of 2238 (item SC101)	79fb6c8c-3892-4545-a76a-b53a39a19074	2026-03-03 05:17:49.53174+00	1
6	105	\N	121008.66	2026-03-03	purchases	2	Payment for purchase of 2238 (item SC101)	79fb6c8c-3892-4545-a76a-b53a39a19074	2026-03-03 05:17:49.532088+00	1
7	104	\N	121008.66	2026-03-03	batches	2	Chick allocation for batch 2 - Item: SC101	d62c9bd9-d002-47da-9beb-b700a1f97d67	2026-03-03 05:18:19.746025+00	1
8	107	121008.66	\N	2026-03-03	batches	2	Chick expense for batch 2 - Item: SC101	d62c9bd9-d002-47da-9beb-b700a1f97d67	2026-03-03 05:18:19.746455+00	1
9	104	159805.33	\N	2026-03-03	purchases	3	Purchase of 3541 (item SC101)	3c62cd3f-35cf-4cdd-be44-16816e81ad93	2026-03-03 05:19:58.38394+00	1
10	105	\N	159805.33	2026-03-03	purchases	3	Payment for purchase of 3541 (item SC101)	3c62cd3f-35cf-4cdd-be44-16816e81ad93	2026-03-03 05:19:58.384812+00	1
11	104	\N	159805.33	2026-03-03	batches	3	Chick allocation for batch 3 - Item: SC101	354cdeb4-d44d-4796-bde1-4a070419a2d8	2026-03-03 05:20:27.339468+00	1
12	107	159805.33	\N	2026-03-03	batches	3	Chick expense for batch 3 - Item: SC101	354cdeb4-d44d-4796-bde1-4a070419a2d8	2026-03-03 05:20:27.340158+00	1
13	104	117478.50	\N	2026-03-03	purchases	4	Purchase of 2550 (item SC101)	c56d416c-5f54-49ba-ab0d-a0ebaaa6fd50	2026-03-03 05:32:52.978846+00	1
14	105	\N	117478.50	2026-03-03	purchases	4	Payment for purchase of 2550 (item SC101)	c56d416c-5f54-49ba-ab0d-a0ebaaa6fd50	2026-03-03 05:32:52.980105+00	1
15	104	\N	117478.50	2026-03-03	batches	4	Chick allocation for batch 4 - Item: SC101	ea66f977-59ec-4453-9690-9f726d1734ef	2026-03-03 05:33:38.305674+00	1
16	107	117478.50	\N	2026-03-03	batches	4	Chick expense for batch 4 - Item: SC101	ea66f977-59ec-4453-9690-9f726d1734ef	2026-03-03 05:33:38.307034+00	1
17	104	116999.10	\N	2026-03-03	purchases	5	Purchase of 2295 (item SC101)	53d3fe24-f819-4d6e-badb-c27c9ed782aa	2026-03-03 09:46:46.151377+00	1
18	105	\N	116999.10	2026-03-03	purchases	5	Payment for purchase of 2295 (item SC101)	53d3fe24-f819-4d6e-badb-c27c9ed782aa	2026-03-03 09:46:46.15264+00	1
19	104	\N	116999.10	2026-03-03	batches	5	Chick allocation for batch 5 - Item: SC101	991404c0-11fd-41ff-8316-a09bb6b01fa8	2026-03-03 09:47:16.392981+00	1
20	107	116999.10	\N	2026-03-03	batches	5	Chick expense for batch 5 - Item: SC101	991404c0-11fd-41ff-8316-a09bb6b01fa8	2026-03-03 09:47:16.394008+00	1
21	104	176798.64	\N	2026-03-03	purchases	6	Purchase of 3468 (item SC101)	25204dd6-603a-4af7-ad03-90dc2c5f8191	2026-03-03 09:50:02.88203+00	1
22	105	\N	176798.64	2026-03-03	purchases	6	Payment for purchase of 3468 (item SC101)	25204dd6-603a-4af7-ad03-90dc2c5f8191	2026-03-03 09:50:02.882745+00	1
23	104	\N	176798.64	2026-03-03	batches	6	Chick allocation for batch 6 - Item: SC101	68634085-646f-480a-9b55-9465c2825db6	2026-03-03 09:50:36.040584+00	1
24	107	176798.64	\N	2026-03-03	batches	6	Chick expense for batch 6 - Item: SC101	68634085-646f-480a-9b55-9465c2825db6	2026-03-03 09:50:36.041038+00	1
25	104	107246.88	\N	2026-03-03	purchases	7	Purchase of 1989 (item SC101)	1c1e49ea-d152-414b-96ed-37c73ad7859d	2026-03-03 10:10:08.056733+00	1
26	105	\N	107246.88	2026-03-03	purchases	7	Payment for purchase of 1989 (item SC101)	1c1e49ea-d152-414b-96ed-37c73ad7859d	2026-03-03 10:10:08.057444+00	1
27	104	\N	107246.88	2026-03-03	batches	7	Chick allocation for batch 7 - Item: SC101	aa010e4e-4ab7-496a-9444-070b6febb202	2026-03-03 10:10:37.07541+00	1
28	107	107246.88	\N	2026-03-03	batches	7	Chick expense for batch 7 - Item: SC101	aa010e4e-4ab7-496a-9444-070b6febb202	2026-03-03 10:10:37.076026+00	1
29	103	175455.00	\N	2026-02-13	purchases	8	Purchase of 100 (item FD102)	a36dca7e-cb29-4c97-805b-13e56ed4be6d	2026-03-04 05:17:37.174571+00	1
30	105	\N	175455.00	2026-02-13	purchases	8	Payment for purchase of 100 (item FD102)	a36dca7e-cb29-4c97-805b-13e56ed4be6d	2026-03-04 05:17:37.175252+00	1
31	103	147227.85	\N	2026-02-13	purchases	9	Purchase of 77 (item FD101)	1038cb67-c4ac-4d48-9d5e-53f819aa2b3d	2026-03-04 05:18:30.04331+00	1
32	105	\N	147227.85	2026-02-13	purchases	9	Payment for purchase of 77 (item FD101)	1038cb67-c4ac-4d48-9d5e-53f819aa2b3d	2026-03-04 05:18:30.044167+00	1
33	103	\N	38241.00	2026-03-04	allocations	8	approve of (requirement 8)	6af3f47a-1fc3-4e1e-9867-abe26582be40	2026-03-04 05:25:00.441843+00	1
34	107	38241.00	\N	2026-03-04	allocations	8	Allocation of - Req #8	6af3f47a-1fc3-4e1e-9867-abe26582be40	2026-03-04 05:25:00.442985+00	1
35	103	\N	57361.50	2026-03-04	allocations	9	approve of (requirement 9)	b9ea99c9-3ee2-4065-95ca-9c8465aead1e	2026-03-04 05:25:05.372489+00	1
36	107	57361.50	\N	2026-03-04	allocations	9	Allocation of - Req #9	b9ea99c9-3ee2-4065-95ca-9c8465aead1e	2026-03-04 05:25:05.373616+00	1
37	103	\N	70182.00	2026-03-04	allocations	10	approve of (requirement 10)	acfdb3b3-bca9-4b53-90cd-ca7868052205	2026-03-04 05:25:08.612339+00	1
38	107	70182.00	\N	2026-03-04	allocations	10	Allocation of - Req #10	acfdb3b3-bca9-4b53-90cd-ca7868052205	2026-03-04 05:25:08.612615+00	1
39	103	228430.00	\N	2026-03-04	purchases	10	Purchase of 125 (item FD101)	539d47e1-fa10-48ba-9c89-6fc60947a1f3	2026-03-04 05:36:00.879054+00	1
40	105	\N	228430.00	2026-03-04	purchases	10	Payment for purchase of 125 (item FD101)	539d47e1-fa10-48ba-9c89-6fc60947a1f3	2026-03-04 05:36:00.880313+00	1
41	103	347213.52	\N	2026-03-04	purchases	11	Purchase of 207 (item FD102)	7693a51c-e05c-429e-8849-ff496db984e5	2026-03-04 05:36:38.897059+00	1
42	105	\N	347213.52	2026-03-04	purchases	11	Payment for purchase of 207 (item FD102)	7693a51c-e05c-429e-8849-ff496db984e5	2026-03-04 05:36:38.897495+00	1
43	103	\N	19120.50	2026-03-04	allocations	11	approve of (requirement 11)	1bda21de-2310-4cb3-b6d5-66d90e466f34	2026-03-04 05:37:13.613489+00	1
44	107	19120.50	\N	2026-03-04	allocations	11	Allocation of - Req #11	1bda21de-2310-4cb3-b6d5-66d90e466f34	2026-03-04 05:37:13.613844+00	1
45	103	\N	37987.17	2026-03-04	allocations	12	approve of (requirement 12)	7695d290-2c94-4657-9649-c298cede9d27	2026-03-04 05:37:23.80962+00	1
46	107	37987.17	\N	2026-03-04	allocations	12	Allocation of - Req #12	7695d290-2c94-4657-9649-c298cede9d27	2026-03-04 05:37:23.809963+00	1
47	103	\N	172367.40	2026-03-04	allocations	13	approve of (requirement 13)	3ee1488f-1f45-43a2-8a33-40951eab38c8	2026-03-04 05:37:34.440066+00	1
48	107	172367.40	\N	2026-03-04	allocations	13	Allocation of - Req #13	3ee1488f-1f45-43a2-8a33-40951eab38c8	2026-03-04 05:37:34.441182+00	1
49	103	\N	32893.92	2026-03-04	allocations	14	approve of (requirement 14)	896159c9-ef2c-4ebd-a78b-d30aac9dcb1f	2026-03-04 05:37:49.774336+00	1
50	107	32893.92	\N	2026-03-04	allocations	14	Allocation of - Req #14	896159c9-ef2c-4ebd-a78b-d30aac9dcb1f	2026-03-04 05:37:49.774686+00	1
51	103	\N	134188.80	2026-03-04	allocations	15	approve of (requirement 15)	4ac7fd87-17da-4c76-a73a-f39561cf1bcd	2026-03-04 05:37:56.22351+00	1
52	107	134188.80	\N	2026-03-04	allocations	15	Allocation of - Req #15	4ac7fd87-17da-4c76-a73a-f39561cf1bcd	2026-03-04 05:37:56.223948+00	1
53	103	\N	63960.40	2026-03-04	allocations	16	approve of (requirement 16)	23bfd949-d0b4-4e71-bcf5-51ea060f8933	2026-03-04 05:38:00.693559+00	1
54	107	63960.40	\N	2026-03-04	allocations	16	Allocation of - Req #16	23bfd949-d0b4-4e71-bcf5-51ea060f8933	2026-03-04 05:38:00.693917+00	1
55	103	\N	92254.80	2026-03-04	allocations	17	approve of (requirement 17)	877a013b-b4d0-432f-9b9a-bbcd95303021	2026-03-04 05:38:04.317226+00	1
56	107	92254.80	\N	2026-03-04	allocations	17	Allocation of - Req #17	877a013b-b4d0-432f-9b9a-bbcd95303021	2026-03-04 05:38:04.317656+00	1
57	103	\N	40203.68	2026-03-04	allocations	18	approve of (requirement 18)	794aa7ac-6f47-44b5-8bb0-9a958968853a	2026-03-04 05:38:07.436093+00	1
58	107	40203.68	\N	2026-03-04	allocations	18	Allocation of - Req #18	794aa7ac-6f47-44b5-8bb0-9a958968853a	2026-03-04 05:38:07.436366+00	1
59	103	\N	50320.80	2026-03-04	allocations	19	approve of (requirement 19)	6047e5d1-903c-4a78-a346-8053382b9cc1	2026-03-04 05:38:12.693161+00	1
60	107	50320.80	\N	2026-03-04	allocations	19	Allocation of - Req #19	6047e5d1-903c-4a78-a346-8053382b9cc1	2026-03-04 05:38:12.69369+00	1
61	103	52995.76	\N	2026-03-04	purchases	12	Purchase of 29 (item FD102)	4ec377c9-1469-44dd-a42a-7c68b11e8122	2026-03-04 05:43:37.884503+00	1
62	105	\N	52995.76	2026-03-04	purchases	12	Payment for purchase of 29 (item FD102)	4ec377c9-1469-44dd-a42a-7c68b11e8122	2026-03-04 05:43:37.884848+00	1
63	104	148496.70	\N	2026-03-04	purchases	13	Purchase of 2805 (item SC101)	04288b34-e789-424b-a17b-228d4f5b2028	2026-03-04 10:02:32.402134+00	1
64	105	\N	148496.70	2026-03-04	purchases	13	Payment for purchase of 2805 (item SC101)	04288b34-e789-424b-a17b-228d4f5b2028	2026-03-04 10:02:32.403357+00	1
65	104	\N	148496.70	2026-03-04	batches	8	Chick allocation for batch 8 - Item: SC101	88121e2c-cf8a-4ce8-aa97-43e7e691447c	2026-03-04 10:08:47.894505+00	1
66	107	148496.70	\N	2026-03-04	batches	8	Chick expense for batch 8 - Item: SC101	88121e2c-cf8a-4ce8-aa97-43e7e691447c	2026-03-04 10:08:47.895195+00	1
67	103	\N	36548.80	2026-03-04	allocations	21	approve of (requirement 21)	e0c99dd1-d259-4661-be0a-190ace1a1678	2026-03-04 10:09:58.90233+00	1
68	107	36548.80	\N	2026-03-04	allocations	21	Allocation of - Req #21	e0c99dd1-d259-4661-be0a-190ace1a1678	2026-03-04 10:09:58.903664+00	1
69	105	628639.28	\N	2026-03-04	supplier_payments	1	Payment to Supplier #2	bdd87356-d903-4061-870d-947de11f69a0	2026-03-04 10:20:39.419623+00	1
70	101	\N	628639.28	2026-03-04	supplier_payments	1	Payment Ref: Some("ALL ")	bdd87356-d903-4061-870d-947de11f69a0	2026-03-04 10:20:39.421189+00	1
71	105	1030331.41	\N	2026-03-04	supplier_payments	2	Payment to Supplier #7	a20b7d86-039d-42ca-8f8e-29914c877512	2026-03-04 10:21:21.109576+00	1
72	101	\N	1030331.41	2026-03-04	supplier_payments	2	Payment Ref: Some("PRE")	a20b7d86-039d-42ca-8f8e-29914c877512	2026-03-04 10:21:21.110341+00	1
73	105	322682.85	\N	2026-03-04	supplier_payments	3	Payment to Supplier #11	b3595847-84bd-4eb5-939d-99f4cf0c30e9	2026-03-04 10:21:46.104311+00	1
74	101	\N	322682.85	2026-03-04	supplier_payments	3	Payment Ref: Some("PPR")	b3595847-84bd-4eb5-939d-99f4cf0c30e9	2026-03-04 10:21:46.105167+00	1
75	103	201283.20	\N	2026-03-02	purchases	14	Purchase of 120 (item FD102)	138d2cdd-62ce-4603-a76d-d4978aea427c	2026-03-04 10:28:58.996197+00	1
76	105	\N	201283.20	2026-03-02	purchases	14	Payment for purchase of 120 (item FD102)	138d2cdd-62ce-4603-a76d-d4978aea427c	2026-03-04 10:28:58.996838+00	1
77	105	201283.20	\N	2026-03-02	supplier_payments	4	Payment to Supplier #2	3db0d698-051c-46df-9150-32ac4a3a0ef9	2026-03-04 10:32:11.780882+00	1
78	101	\N	201283.20	2026-03-02	supplier_payments	4	Payment Ref: Some("5248970526")	3db0d698-051c-46df-9150-32ac4a3a0ef9	2026-03-04 10:32:11.781521+00	1
79	103	71352.22	\N	2026-03-04	purchases	15	Purchase of 38 (item FD101)	067687f1-5b03-48eb-a0c8-126a67bdec4e	2026-03-04 10:40:21.023365+00	1
80	105	\N	71352.22	2026-03-04	purchases	15	Payment for purchase of 38 (item FD101)	067687f1-5b03-48eb-a0c8-126a67bdec4e	2026-03-04 10:40:21.024531+00	1
81	103	3355.32	\N	2026-03-04	purchases	16	Purchase of 2 (item FD102)	c5509ecb-343f-4282-8182-af9e063b9d30	2026-03-04 10:41:36.285486+00	1
82	105	\N	3355.32	2026-03-04	purchases	16	Payment for purchase of 2 (item FD102)	c5509ecb-343f-4282-8182-af9e063b9d30	2026-03-04 10:41:36.285937+00	1
83	103	33011.20	\N	2026-03-04	purchases	17	Purchase of 20 (item FD103)	3cc75dc7-0a0e-4eca-bfdb-153cb5b17796	2026-03-04 10:44:10.188596+00	1
84	105	\N	33011.20	2026-03-04	purchases	17	Payment for purchase of 20 (item FD103)	3cc75dc7-0a0e-4eca-bfdb-153cb5b17796	2026-03-04 10:44:10.189983+00	1
85	103	7700.00	\N	2026-03-04	purchases	18	Purchase of 180 (item FD104)	774a29a3-bdde-49ba-b6c9-c3fc18b6455b	2026-03-04 10:49:17.74253+00	1
86	105	\N	7700.00	2026-03-04	purchases	18	Payment for purchase of 180 (item FD104)	774a29a3-bdde-49ba-b6c9-c3fc18b6455b	2026-03-04 10:49:17.743158+00	1
87	105	115418.74	\N	2026-03-04	supplier_payments	5	Payment to Supplier #2	e3c12a4e-ddcb-46d8-8396-e4f239324ca2	2026-03-04 12:31:59.788871+00	1
88	101	\N	115418.74	2026-03-04	supplier_payments	5	Payment Ref: Some("5249184718")	e3c12a4e-ddcb-46d8-8396-e4f239324ca2	2026-03-04 12:31:59.789762+00	1
89	103	50250.00	\N	2026-03-06	purchases	19	Purchase of 30 (item FD102)	888126bc-d9a3-4f09-aaa0-1e8eb8d357f6	2026-03-06 18:06:44.458038+00	1
90	105	\N	50250.00	2026-03-06	purchases	19	Payment for purchase of 30 (item FD102)	888126bc-d9a3-4f09-aaa0-1e8eb8d357f6	2026-03-06 18:06:44.458948+00	1
91	103	47850.00	\N	2026-03-06	purchases	20	Purchase of 30 (item FD103)	2d8394fc-6dcb-4f25-a75a-13a7acbe22df	2026-03-06 18:07:18.327503+00	1
92	105	\N	47850.00	2026-03-06	purchases	20	Payment for purchase of 30 (item FD103)	2d8394fc-6dcb-4f25-a75a-13a7acbe22df	2026-03-06 18:07:18.327847+00	1
93	103	355200.00	\N	2026-03-06	purchases	21	Purchase of 200 (item FD102)	e4b46a0b-ba0c-45fc-8de3-0ab531702cec	2026-03-06 18:08:21.630185+00	1
94	105	\N	355200.00	2026-03-06	purchases	21	Payment for purchase of 200 (item FD102)	e4b46a0b-ba0c-45fc-8de3-0ab531702cec	2026-03-06 18:08:21.630468+00	1
101	103	\N	35224.56	2026-03-10	allocations	22	approve of (requirement 22)	53f46d1b-4c01-4801-b0e8-12bb06fef186	2026-03-10 06:10:45.797961+00	1
102	107	35224.56	\N	2026-03-10	allocations	22	Allocation of - Req #22	53f46d1b-4c01-4801-b0e8-12bb06fef186	2026-03-10 06:10:45.79855+00	1
103	103	\N	19806.72	2026-03-10	allocations	23	approve of (requirement 23)	d1054d6d-4430-42c7-922a-f74549b519bb	2026-03-10 06:10:47.638899+00	1
104	107	19806.72	\N	2026-03-10	allocations	23	Allocation of - Req #23	d1054d6d-4430-42c7-922a-f74549b519bb	2026-03-10 06:10:47.639801+00	1
105	103	100641.60	\N	2026-03-10	purchases	25	Purchase of 60 (item FD102)	f94c6064-de68-4adb-88bf-e36140af5ab8	2026-03-10 12:28:37.144271+00	1
106	105	\N	100641.60	2026-03-10	purchases	25	Payment for purchase of 60 (item FD102)	f94c6064-de68-4adb-88bf-e36140af5ab8	2026-03-10 12:28:37.14541+00	1
107	103	2500.00	\N	2026-03-10	purchases	26	Purchase of 60 (item FD104)	87f0de0f-b307-4be9-9de0-28f6507426c7	2026-03-10 12:30:42.115868+00	1
108	105	\N	2500.00	2026-03-10	purchases	26	Payment for purchase of 60 (item FD104)	87f0de0f-b307-4be9-9de0-28f6507426c7	2026-03-10 12:30:42.116584+00	1
109	110	56540.40	\N	2026-03-10	batch_sales	1	Sale for batch 2	099fed04-c40b-48c0-8176-f59e799d5b90	2026-03-10 14:02:10.749019+00	1
110	108	\N	56540.40	2026-03-10	batch_sales	1	Revenue from sale for batch 2	099fed04-c40b-48c0-8176-f59e799d5b90	2026-03-10 14:02:10.750152+00	1
111	110	162334.80	\N	2026-03-10	batch_sales	2	Sale for batch 2	8bb1d04c-9b6e-4f01-9b0d-3a113f6b0304	2026-03-10 14:27:55.183644+00	1
112	108	\N	162334.80	2026-03-10	batch_sales	2	Revenue from sale for batch 2	8bb1d04c-9b6e-4f01-9b0d-3a113f6b0304	2026-03-10 14:27:55.185664+00	1
113	110	105517.70	\N	2026-03-10	batch_sales	3	Sale for batch 2	ae3fc0d8-7843-44ea-96d7-4a810d8e2d73	2026-03-10 14:28:38.217567+00	1
114	108	\N	105517.70	2026-03-10	batch_sales	3	Revenue from sale for batch 2	ae3fc0d8-7843-44ea-96d7-4a810d8e2d73	2026-03-10 14:28:38.218003+00	1
115	110	52517.70	\N	2026-03-10	batch_sales	4	Sale for batch 2	23f747e8-6c60-44e6-a777-722c7a049918	2026-03-10 14:29:16.181753+00	1
116	108	\N	52517.70	2026-03-10	batch_sales	4	Revenue from sale for batch 2	23f747e8-6c60-44e6-a777-722c7a049918	2026-03-10 14:29:16.183411+00	1
119	110	68779.60	\N	2026-03-10	batch_sales	6	Sale for batch 2	35849c67-9f11-4286-9c2b-9bc7fcb6b8c1	2026-03-10 14:30:29.420401+00	1
120	108	\N	68779.60	2026-03-10	batch_sales	6	Revenue from sale for batch 2	35849c67-9f11-4286-9c2b-9bc7fcb6b8c1	2026-03-10 14:30:29.420719+00	1
121	110	10935.40	\N	2026-03-10	batch_sales	7	Sale for batch 2	40f0d180-a585-458e-97a1-2e3dbd48f023	2026-03-10 14:30:57.86204+00	1
122	108	\N	10935.40	2026-03-10	batch_sales	7	Revenue from sale for batch 2	40f0d180-a585-458e-97a1-2e3dbd48f023	2026-03-10 14:30:57.862459+00	1
117	110	62243.20	\N	2026-03-10	batch_sales	5	Sale for batch 2	9bd5c6ae-514d-413f-9903-924f4412066b	2026-03-10 14:30:00.558303+00	1
118	108	\N	62243.20	2026-03-10	batch_sales	5	Revenue from sale for batch 2	9bd5c6ae-514d-413f-9903-924f4412066b	2026-03-10 14:30:00.559045+00	1
123	110	1206.00	\N	2026-03-10	batch_sales	8	Sale for batch 2	a1621422-5756-4647-a329-591e941422b2	2026-03-10 14:31:24.752885+00	1
124	108	\N	1206.00	2026-03-10	batch_sales	8	Revenue from sale for batch 2	a1621422-5756-4647-a329-591e941422b2	2026-03-10 14:31:24.753162+00	1
125	103	\N	14619.52	2026-03-11	allocations	24	approve of (requirement 24)	c834dd0b-b6fc-49c5-a530-78d8edc83931	2026-03-11 09:21:18.094499+00	1
126	107	14619.52	\N	2026-03-11	allocations	24	Allocation of - Req #24	c834dd0b-b6fc-49c5-a530-78d8edc83931	2026-03-11 09:21:18.09529+00	1
127	103	\N	53675.52	2026-03-11	allocations	25	approve of (requirement 25)	03319523-895d-4c32-ba17-d6fdc6512f21	2026-03-11 09:22:18.367184+00	1
128	107	53675.52	\N	2026-03-11	allocations	25	Allocation of - Req #25	03319523-895d-4c32-ba17-d6fdc6512f21	2026-03-11 09:22:18.368113+00	1
129	103	\N	115737.84	2026-03-11	allocations	26	approve of (requirement 26)	170b1631-bb06-435a-886e-136fb26d3250	2026-03-11 09:23:45.23502+00	1
130	107	115737.84	\N	2026-03-11	allocations	26	Allocation of - Req #26	170b1631-bb06-435a-886e-136fb26d3250	2026-03-11 09:23:45.235918+00	1
131	103	\N	108377.08	2026-03-11	allocations	27	approve of (requirement 27)	8cdf4f40-7083-40fa-ace7-bae2753b5c8d	2026-03-11 09:25:27.909344+00	1
132	107	108377.08	\N	2026-03-11	allocations	27	Allocation of - Req #27	8cdf4f40-7083-40fa-ace7-bae2753b5c8d	2026-03-11 09:25:27.910148+00	1
133	103	\N	131424.00	2026-03-11	allocations	28	approve of (requirement 28)	4a4c0388-ee78-4824-b3f1-c73bbb1bee5e	2026-03-11 09:26:22.756321+00	1
134	107	131424.00	\N	2026-03-11	allocations	28	Allocation of - Req #28	4a4c0388-ee78-4824-b3f1-c73bbb1bee5e	2026-03-11 09:26:22.756756+00	1
135	103	9137.20	\N	2026-03-11	stock_returns	1	Stock return for allocation line 18	d6375ac6-2979-4c8d-970a-27f5325da68a	2026-03-11 09:38:58.74343+00	1
136	107	\N	9137.20	2026-03-11	stock_returns	1	Return reversal for allocation line 18	d6375ac6-2979-4c8d-970a-27f5325da68a	2026-03-11 09:38:58.744759+00	1
137	103	\N	184704.00	2026-03-11	allocations	29	approve of (requirement 29)	7102a72f-1575-4f3c-9d7e-d1e0ac8b2ad9	2026-03-11 09:41:56.951939+00	1
138	107	184704.00	\N	2026-03-11	allocations	29	Allocation of - Req #29	7102a72f-1575-4f3c-9d7e-d1e0ac8b2ad9	2026-03-11 09:41:56.953078+00	1
139	103	\N	9137.20	2026-03-11	allocations	30	approve of (requirement 30)	d73cb4fb-16e3-434b-9ec1-646bf771575a	2026-03-11 09:44:29.45145+00	1
140	107	9137.20	\N	2026-03-11	allocations	30	Allocation of - Req #30	d73cb4fb-16e3-434b-9ec1-646bf771575a	2026-03-11 09:44:29.451864+00	1
141	103	15000.00	\N	2026-03-11	purchases	27	Purchase of 200 (item FD104)	b74f8aa5-0935-40ed-8cfc-86947f0dc328	2026-03-11 09:45:46.86609+00	1
142	105	\N	15000.00	2026-03-11	purchases	27	Payment for purchase of 200 (item FD104)	b74f8aa5-0935-40ed-8cfc-86947f0dc328	2026-03-11 09:45:46.867133+00	1
143	103	2550.00	\N	2026-03-11	purchases	28	Purchase of 60 (item FD104)	dfe81251-0274-4a40-97ef-28f85f865b75	2026-03-11 09:46:14.759789+00	1
144	105	\N	2550.00	2026-03-11	purchases	28	Payment for purchase of 60 (item FD104)	dfe81251-0274-4a40-97ef-28f85f865b75	2026-03-11 09:46:14.761076+00	1
145	106	50891.00	\N	2026-03-11	farmer_commission_history	1	Farmer commission debit	43c18b64-c2d5-426e-b2a9-99ebb8565e59	2026-03-11 09:53:22.215893+00	1
146	101	\N	50891.00	2026-03-11	farmer_commission_history	1	Cash paid for farmer commission	43c18b64-c2d5-426e-b2a9-99ebb8565e59	2026-03-11 09:53:22.215893+00	1
147	103	\N	1776.00	2026-03-11	allocations	31	approve of (requirement 31)	06b50f36-1c0e-4d2f-88a1-916c0e3b2a11	2026-03-11 11:04:48.475063+00	1
148	107	1776.00	\N	2026-03-11	allocations	31	Allocation of - Req #31	06b50f36-1c0e-4d2f-88a1-916c0e3b2a11	2026-03-11 11:04:48.475731+00	1
149	102	1600.00	\N	2026-03-11	purchases	29	Purchase of 10 (item MD101)	cb0be082-2a39-46bd-8d09-90e86dd489e8	2026-03-11 11:06:11.788794+00	1
150	105	\N	1600.00	2026-03-11	purchases	29	Payment for purchase of 10 (item MD101)	cb0be082-2a39-46bd-8d09-90e86dd489e8	2026-03-11 11:06:11.789518+00	1
151	102	\N	1600.00	2026-03-11	allocations	32	approve of (requirement 32)	e8f89ea3-7d24-4c26-9b6f-aeac485f06c4	2026-03-11 11:06:53.048752+00	1
152	107	1600.00	\N	2026-03-11	allocations	32	Allocation of - Req #32	e8f89ea3-7d24-4c26-9b6f-aeac485f06c4	2026-03-11 11:06:53.049309+00	1
153	101	132704.00	\N	2026-03-11	batch_sales	9	Sale for batch 7	352cffe3-ea0c-406c-8da3-f7409780e00c	2026-03-11 12:11:30.530617+00	1
154	108	\N	132704.00	2026-03-11	batch_sales	9	Revenue from sale for batch 7	352cffe3-ea0c-406c-8da3-f7409780e00c	2026-03-11 12:11:30.531902+00	1
155	110	17867.20	\N	2026-03-11	batch_sales	10	Sale for batch 7	f251ffe6-0be2-4f42-880f-b7cec452bb00	2026-03-11 12:16:12.912611+00	1
156	108	\N	17867.20	2026-03-11	batch_sales	10	Revenue from sale for batch 7	f251ffe6-0be2-4f42-880f-b7cec452bb00	2026-03-11 12:16:12.912993+00	1
157	110	132704.00	\N	2026-03-11	batch_sales	11	Sale for batch 7	e356736b-b4c6-4794-beb0-f03b7282063d	2026-03-11 12:16:47.099979+00	1
158	108	\N	132704.00	2026-03-11	batch_sales	11	Revenue from sale for batch 7	e356736b-b4c6-4794-beb0-f03b7282063d	2026-03-11 12:16:47.10048+00	1
159	110	124259.20	\N	2026-03-11	batch_sales	12	Sale for batch 7	758141f8-3dde-4fae-9d6c-95a4aab36d83	2026-03-11 12:17:35.225198+00	1
160	108	\N	124259.20	2026-03-11	batch_sales	12	Revenue from sale for batch 7	758141f8-3dde-4fae-9d6c-95a4aab36d83	2026-03-11 12:17:35.225904+00	1
161	110	49270.00	\N	2026-03-11	batch_sales	13	Sale for batch 7	5063fe50-a2bc-4b44-870d-e7690b0ac7fb	2026-03-11 12:18:49.721902+00	1
162	108	\N	49270.00	2026-03-11	batch_sales	13	Revenue from sale for batch 7	5063fe50-a2bc-4b44-870d-e7690b0ac7fb	2026-03-11 12:18:49.723243+00	1
163	110	907.50	\N	2026-03-11	batch_sales	14	Sale for batch 7	1eea6dde-0d8f-4851-bb2f-2d4dce70facb	2026-03-11 12:19:11.692052+00	1
164	108	\N	907.50	2026-03-11	batch_sales	14	Revenue from sale for batch 7	1eea6dde-0d8f-4851-bb2f-2d4dce70facb	2026-03-11 12:19:11.69366+00	1
165	105	98100.00	\N	2026-03-06	supplier_payments	6	Payment to Supplier #4	42af6b9b-8424-4fef-abb8-003f16353da5	2026-03-11 13:27:50.948962+00	1
166	101	\N	98100.00	2026-03-06	supplier_payments	6	Payment Ref: Some("524960863")	42af6b9b-8424-4fef-abb8-003f16353da5	2026-03-11 13:27:50.949812+00	1
167	103	3654.88	\N	2026-03-12	stock_returns	2	Stock return for allocation line 36	7ee531e6-8de0-437f-a519-79b4ea7fc6aa	2026-03-12 05:42:02.551392+00	1
168	107	\N	3654.88	2026-03-12	stock_returns	2	Return reversal for allocation line 36	7ee531e6-8de0-437f-a519-79b4ea7fc6aa	2026-03-12 05:42:02.552052+00	1
169	103	17760.00	\N	2026-03-12	stock_returns	3	Stock return for allocation line 35	89f46af7-1061-43bf-ad17-9506a4ad2712	2026-03-12 05:43:36.459401+00	1
170	107	\N	17760.00	2026-03-12	stock_returns	3	Return reversal for allocation line 35	89f46af7-1061-43bf-ad17-9506a4ad2712	2026-03-12 05:43:36.460487+00	1
171	103	\N	16394.48	2026-03-12	allocations	33	approve of (requirement 33)	380ca324-a2f6-442c-b9db-487ec3bbdc3a	2026-03-12 05:44:03.226843+00	1
172	107	16394.48	\N	2026-03-12	allocations	33	Allocation of - Req #33	380ca324-a2f6-442c-b9db-487ec3bbdc3a	2026-03-12 05:44:03.229189+00	1
173	103	\N	3190.00	2026-03-12	allocations	34	approve of (requirement 34)	d4a35b77-0dc5-4605-8654-9b2466eec78a	2026-03-12 05:45:02.834203+00	1
174	107	3190.00	\N	2026-03-12	allocations	34	Allocation of - Req #34	d4a35b77-0dc5-4605-8654-9b2466eec78a	2026-03-12 05:45:02.834559+00	1
175	102	1500.00	\N	2026-03-12	purchases	30	Purchase of 10 (item MD101)	c14dcc4b-5fa0-4e90-b51a-5740d6f93523	2026-03-12 05:45:38.318307+00	1
176	105	\N	1500.00	2026-03-12	purchases	30	Payment for purchase of 10 (item MD101)	c14dcc4b-5fa0-4e90-b51a-5740d6f93523	2026-03-12 05:45:38.318688+00	1
177	102	\N	1500.00	2026-03-12	allocations	35	approve of (requirement 35)	ca63b82c-bcbf-42e8-bd60-35cadbdb9a9f	2026-03-12 05:46:00.352761+00	1
178	107	1500.00	\N	2026-03-12	allocations	35	Allocation of - Req #35	ca63b82c-bcbf-42e8-bd60-35cadbdb9a9f	2026-03-12 05:46:00.353521+00	1
179	110	110076.25	\N	2026-03-12	batch_sales	15	Sale for batch 1	4c0cf565-b740-4158-9934-1101546ce783	2026-03-12 05:52:16.998125+00	1
180	108	\N	110076.25	2026-03-12	batch_sales	15	Revenue from sale for batch 1	4c0cf565-b740-4158-9934-1101546ce783	2026-03-12 05:52:16.998806+00	1
181	110	128860.10	\N	2026-03-12	batch_sales	16	Sale for batch 1	9016124b-2509-4233-b65c-b6f129fcafe0	2026-03-12 05:52:40.851349+00	1
182	108	\N	128860.10	2026-03-12	batch_sales	16	Revenue from sale for batch 1	9016124b-2509-4233-b65c-b6f129fcafe0	2026-03-12 05:52:40.851885+00	1
183	110	32945.30	\N	2026-03-12	batch_sales	17	Sale for batch 1	81eb9998-a8fc-4caf-bfb2-9a2aa6f74b7e	2026-03-12 05:53:12.264817+00	1
184	108	\N	32945.30	2026-03-12	batch_sales	17	Revenue from sale for batch 1	81eb9998-a8fc-4caf-bfb2-9a2aa6f74b7e	2026-03-12 05:53:12.265122+00	1
185	110	87690.50	\N	2026-03-12	batch_sales	18	Sale for batch 1	065558cf-ed6c-4565-9560-ed782d520f2b	2026-03-12 05:53:58.525778+00	1
186	108	\N	87690.50	2026-03-12	batch_sales	18	Revenue from sale for batch 1	065558cf-ed6c-4565-9560-ed782d520f2b	2026-03-12 05:53:58.526131+00	1
187	110	644.00	\N	2026-03-12	batch_sales	19	Sale for batch 1	04f1ca8a-6c81-4660-8051-5977f086cf7f	2026-03-12 05:54:21.284097+00	1
188	108	\N	644.00	2026-03-12	batch_sales	19	Revenue from sale for batch 1	04f1ca8a-6c81-4660-8051-5977f086cf7f	2026-03-12 05:54:21.284607+00	1
189	103	95700.00	\N	2026-03-12	purchases	31	Purchase of 60 (item FD103)	f9c6f8ef-ab91-4f44-9c24-e277acbb5e41	2026-03-12 09:51:19.013779+00	1
190	105	\N	95700.00	2026-03-12	purchases	31	Payment for purchase of 60 (item FD103)	f9c6f8ef-ab91-4f44-9c24-e277acbb5e41	2026-03-12 09:51:19.014681+00	1
191	103	2500.00	\N	2026-03-12	purchases	32	Purchase of 60 (item FD104)	010695c2-95e9-474e-abe1-b957f06b1168	2026-03-12 09:52:49.498883+00	1
192	105	\N	2500.00	2026-03-12	purchases	32	Payment for purchase of 60 (item FD104)	010695c2-95e9-474e-abe1-b957f06b1168	2026-03-12 09:52:49.500733+00	1
193	104	104499.93	\N	2026-03-12	purchases	33	Purchase of 1931 (item SC101)	f57ab8a7-df61-4590-86fc-53bf92e2ed34	2026-03-12 13:33:35.645435+00	1
194	105	\N	104499.93	2026-03-12	purchases	33	Payment for purchase of 1931 (item SC101)	f57ab8a7-df61-4590-86fc-53bf92e2ed34	2026-03-12 13:33:35.647382+00	1
195	104	\N	104505.72	2026-03-12	batches	9	Chick allocation for batch 9 - Item: SC101	09d08ef6-f8e4-4f1e-a1f8-685a66c6735a	2026-03-12 13:34:10.669436+00	1
196	107	104505.72	\N	2026-03-12	batches	9	Chick expense for batch 9 - Item: SC101	09d08ef6-f8e4-4f1e-a1f8-685a66c6735a	2026-03-12 13:34:10.669702+00	1
197	103	\N	21929.28	2026-03-12	allocations	37	approve of (requirement 37)	ad44348a-1075-46b7-b973-59e5685a94ac	2026-03-12 13:35:30.743489+00	1
198	107	21929.28	\N	2026-03-12	allocations	37	Allocation of - Req #37	ad44348a-1075-46b7-b973-59e5685a94ac	2026-03-12 13:35:30.744908+00	1
199	103	41934.00	\N	2026-03-14	purchases	34	Purchase of 25 (item FD102)	13924ed8-6641-44ff-9d65-921087230b6c	2026-03-14 06:32:08.337306+00	1
200	105	\N	41934.00	2026-03-14	purchases	34	Payment for purchase of 25 (item FD102)	13924ed8-6641-44ff-9d65-921087230b6c	2026-03-14 06:32:08.338579+00	1
201	103	57769.60	\N	2026-03-14	purchases	35	Purchase of 35 (item FD103)	b1e69f8e-0cee-4feb-8e9b-faed751957ef	2026-03-14 06:33:43.173273+00	1
202	105	\N	57769.60	2026-03-14	purchases	35	Payment for purchase of 35 (item FD103)	b1e69f8e-0cee-4feb-8e9b-faed751957ef	2026-03-14 06:33:43.173945+00	1
203	103	2500.00	\N	2026-03-14	purchases	36	Purchase of 60 (item FD104)	16c2ed1e-81bf-465d-be91-bcf08fc13d08	2026-03-14 06:34:56.527968+00	1
204	105	\N	2500.00	2026-03-14	purchases	36	Payment for purchase of 60 (item FD104)	16c2ed1e-81bf-465d-be91-bcf08fc13d08	2026-03-14 06:34:56.52846+00	1
205	104	173600.00	\N	2026-03-14	purchases	37	Purchase of 3162 (item SC101)	9b93d83d-a77d-42f6-b9d5-c3e1395a7b37	2026-03-14 08:36:40.614429+00	1
206	105	\N	173600.00	2026-03-14	purchases	37	Payment for purchase of 3162 (item SC101)	9b93d83d-a77d-42f6-b9d5-c3e1395a7b37	2026-03-14 08:36:40.61532+00	1
207	104	\N	173593.80	2026-03-14	batches	10	Chick allocation for batch 10 - Item: SC101	99aa542a-df11-447b-82fa-41f19d8913bc	2026-03-14 08:39:54.131334+00	1
208	107	173593.80	\N	2026-03-14	batches	10	Chick expense for batch 10 - Item: SC101	99aa542a-df11-447b-82fa-41f19d8913bc	2026-03-14 08:39:54.133046+00	1
209	110	\N	56540.40	2026-03-14	trader_payments	1	Received from Trader #1	ae4cd9f7-5b51-42d9-9b60-4d46dc8b7a30	2026-03-14 08:47:08.701254+00	1
210	101	56540.40	\N	2026-03-14	trader_payments	1	Payment Ref: Some("")	ae4cd9f7-5b51-42d9-9b60-4d46dc8b7a30	2026-03-14 08:47:08.70164+00	1
211	110	\N	250025.30	2026-03-14	trader_payments	2	Received from Trader #2	0334db0f-172d-46d9-8e9f-af8c63e42fd1	2026-03-14 08:48:07.803308+00	1
212	101	250025.30	\N	2026-03-14	trader_payments	2	Payment Ref: Some("")	0334db0f-172d-46d9-8e9f-af8c63e42fd1	2026-03-14 08:48:07.804264+00	1
213	110	\N	128860.10	2026-03-14	trader_payments	3	Received from Trader #9	61cf4dc5-a785-4260-babe-febb92129662	2026-03-14 08:48:26.901754+00	1
214	101	128860.10	\N	2026-03-14	trader_payments	3	Payment Ref: Some("")	61cf4dc5-a785-4260-babe-febb92129662	2026-03-14 08:48:26.902691+00	1
215	110	\N	219384.00	2026-03-14	trader_payments	4	Received from Trader #3	582c1e0e-7ce6-48cc-93c8-225b626b64e4	2026-03-14 08:48:54.88971+00	1
216	101	219384.00	\N	2026-03-14	trader_payments	4	Payment Ref: Some("")	582c1e0e-7ce6-48cc-93c8-225b626b64e4	2026-03-14 08:48:54.890096+00	1
217	110	\N	226954.40	2026-03-14	trader_payments	5	Received from Trader #4	b99a7d8d-d41a-4385-9010-c5d5fb1698b8	2026-03-14 08:49:08.684315+00	1
218	101	226954.40	\N	2026-03-14	trader_payments	5	Payment Ref: Some("")	b99a7d8d-d41a-4385-9010-c5d5fb1698b8	2026-03-14 08:49:08.68506+00	1
219	110	\N	62243.20	2026-03-14	trader_payments	6	Received from Trader #5	b2a68c72-5b0f-4d35-99e5-0382952739b7	2026-03-14 08:49:27.968505+00	1
220	101	62243.20	\N	2026-03-14	trader_payments	6	Payment Ref: Some("")	b2a68c72-5b0f-4d35-99e5-0382952739b7	2026-03-14 08:49:27.968939+00	1
221	110	\N	110076.25	2026-03-14	trader_payments	7	Received from Trader #8	b5df412d-1ad4-4241-9c3a-b6058dde9c76	2026-03-14 08:49:41.604918+00	1
222	101	110076.25	\N	2026-03-14	trader_payments	7	Payment Ref: Some("")	b5df412d-1ad4-4241-9c3a-b6058dde9c76	2026-03-14 08:49:41.605271+00	1
223	110	\N	132704.00	2026-03-14	trader_payments	8	Received from Trader #6	e7a628fc-5383-4a12-8c0b-4eb24d9688ea	2026-03-14 08:49:58.553638+00	1
224	101	132704.00	\N	2026-03-14	trader_payments	8	Payment Ref: Some("")	e7a628fc-5383-4a12-8c0b-4eb24d9688ea	2026-03-14 08:49:58.553947+00	1
225	110	\N	17867.20	2026-03-14	trader_payments	9	Received from Trader #7	38c4152a-188f-4c3b-8e49-0a1f797d4ca0	2026-03-14 08:50:06.868105+00	1
226	101	17867.20	\N	2026-03-14	trader_payments	9	Payment Ref: Some("")	38c4152a-188f-4c3b-8e49-0a1f797d4ca0	2026-03-14 08:50:06.868366+00	1
227	110	\N	644.00	2026-03-14	trader_payments	10	Received from Trader #10	84c811dc-e102-486b-bece-866ce3fed544	2026-03-14 08:50:23.463591+00	1
228	101	644.00	\N	2026-03-14	trader_payments	10	Payment Ref: Some("")	84c811dc-e102-486b-bece-866ce3fed544	2026-03-14 08:50:23.463879+00	1
229	105	100642.00	\N	2026-03-14	supplier_payments	7	Payment to Supplier #2	e3b775dd-a747-4322-b939-50db877328f0	2026-03-14 08:52:17.495578+00	1
230	101	\N	100642.00	2026-03-14	supplier_payments	7	Payment Ref: Some("5250698662")	e3b775dd-a747-4322-b939-50db877328f0	2026-03-14 08:52:17.496148+00	1
231	105	99703.00	\N	2026-03-14	supplier_payments	8	Payment to Supplier #2	05a7b418-d74c-4bf4-9996-c229dc1ebb27	2026-03-14 10:14:55.617521+00	1
232	101	\N	99703.00	2026-03-14	supplier_payments	8	Payment Ref: Some("5251085099")	05a7b418-d74c-4bf4-9996-c229dc1ebb27	2026-03-14 10:14:55.619127+00	1
233	105	5000.00	\N	2026-03-14	supplier_payments	9	Payment to Supplier #2	23545c77-fc8e-46aa-83c0-1dfc876bd9d0	2026-03-14 10:15:21.681949+00	1
234	101	\N	5000.00	2026-03-14	supplier_payments	9	Payment Ref: Some("")	23545c77-fc8e-46aa-83c0-1dfc876bd9d0	2026-03-14 10:15:21.682489+00	1
235	105	95700.00	\N	2026-03-12	supplier_payments	10	Payment to Supplier #4	bbdeab86-b6f2-480e-9ac9-3f6e77834a90	2026-03-14 10:17:30.750464+00	1
236	101	\N	95700.00	2026-03-12	supplier_payments	10	Payment Ref: Some("5250692528")	bbdeab86-b6f2-480e-9ac9-3f6e77834a90	2026-03-14 10:17:30.750885+00	1
237	105	2500.00	\N	2026-03-14	supplier_payments	11	Payment to Supplier #4	337fb6a3-54da-4e39-8643-5577ac4308a2	2026-03-14 10:17:58.911788+00	1
238	101	\N	2500.00	2026-03-14	supplier_payments	11	Payment Ref: Some("")	337fb6a3-54da-4e39-8643-5577ac4308a2	2026-03-14 10:17:58.912158+00	1
239	105	278099.93	\N	2026-03-14	supplier_payments	12	Payment to Supplier #7	682c3696-890d-420e-884c-0a6412e3fb84	2026-03-14 10:19:05.246141+00	1
240	101	\N	278099.93	2026-03-14	supplier_payments	12	Payment Ref: Some("")	682c3696-890d-420e-884c-0a6412e3fb84	2026-03-14 10:19:05.247312+00	1
241	105	322682.85	\N	2026-03-14	supplier_payments	13	Payment to Supplier #11	d947dfbe-07a4-4d28-aaa9-811095d0fa33	2026-03-14 10:19:22.673287+00	1
242	101	\N	322682.85	2026-03-14	supplier_payments	13	Payment Ref: Some("")	d947dfbe-07a4-4d28-aaa9-811095d0fa33	2026-03-14 10:19:22.674273+00	1
243	105	17500.00	\N	2026-03-14	supplier_payments	14	Payment to Supplier #12	bb04df40-e003-4311-910e-a2870c265d5f	2026-03-14 10:19:33.741964+00	1
244	101	\N	17500.00	2026-03-14	supplier_payments	14	Payment Ref: Some("")	bb04df40-e003-4311-910e-a2870c265d5f	2026-03-14 10:19:33.742667+00	1
245	105	1500.00	\N	2026-03-14	supplier_payments	15	Payment to Supplier #10	08f4ddb7-0b94-4c71-ae96-1791bcdfc222	2026-03-14 10:19:46.404857+00	1
246	101	\N	1500.00	2026-03-14	supplier_payments	15	Payment Ref: Some("")	08f4ddb7-0b94-4c71-ae96-1791bcdfc222	2026-03-14 10:19:46.405349+00	1
247	105	1600.00	\N	2026-03-14	supplier_payments	16	Payment to Supplier #8	a7876bcd-454b-47c7-a067-a9984d6c940e	2026-03-14 10:20:04.387417+00	1
248	101	\N	1600.00	2026-03-14	supplier_payments	16	Payment Ref: Some("")	a7876bcd-454b-47c7-a067-a9984d6c940e	2026-03-14 10:20:04.387876+00	1
249	105	32517.15	\N	2026-03-14	supplier_payments	17	Payment to Supplier #11	fec4422f-f744-4c76-872e-66f2c5cefc25	2026-03-14 10:20:44.008757+00	1
250	101	\N	32517.15	2026-03-14	supplier_payments	17	Payment Ref: Some("")	fec4422f-f744-4c76-872e-66f2c5cefc25	2026-03-14 10:20:44.009144+00	1
251	105	50.00	\N	2026-03-14	supplier_payments	18	Payment to Supplier #12	691074e8-b170-4379-af95-6511d52f3a9e	2026-03-14 10:20:56.65949+00	1
252	101	\N	50.00	2026-03-14	supplier_payments	18	Payment Ref: Some("")	691074e8-b170-4379-af95-6511d52f3a9e	2026-03-14 10:20:56.659975+00	1
253	103	\N	55878.45	2026-03-16	allocations	39	approve of (requirement 39)	4f26abf4-fa80-4c0b-8122-2d59fe3af019	2026-03-16 15:26:38.55529+00	1
254	107	55878.45	\N	2026-03-16	allocations	39	Allocation of - Req #39	4f26abf4-fa80-4c0b-8122-2d59fe3af019	2026-03-16 15:26:38.55603+00	1
255	104	131100.00	\N	2026-03-18	purchases	38	Purchase of 2344 (item SC101)	5f3dcbcb-c06d-415c-ab9a-439a8c71ab63	2026-03-18 05:30:08.875944+00	1
256	105	\N	131100.00	2026-03-18	purchases	38	Payment for purchase of 2344 (item SC101)	5f3dcbcb-c06d-415c-ab9a-439a8c71ab63	2026-03-18 05:30:08.876974+00	1
257	104	\N	131099.92	2026-03-18	batches	11	Chick allocation for batch 11 - Item: SC101	12aa16d9-6d13-4f37-b095-e7611cbb6220	2026-03-18 05:33:19.461832+00	1
258	107	131099.92	\N	2026-03-18	batches	11	Chick expense for batch 11 - Item: SC101	12aa16d9-6d13-4f37-b095-e7611cbb6220	2026-03-18 05:33:19.462487+00	1
259	103	43186.87	\N	2026-03-18	purchases	39	Purchase of 23 (item FD101)	3f17a788-2dab-432d-a1d6-25e8902d11cc	2026-03-19 07:33:51.026525+00	1
260	105	\N	43186.87	2026-03-18	purchases	39	Payment for purchase of 23 (item FD101)	3f17a788-2dab-432d-a1d6-25e8902d11cc	2026-03-19 07:33:51.02813+00	1
263	103	57769.60	\N	2026-03-18	purchases	41	Purchase of 35 (item FD103)	89ada632-5a10-4fda-984f-3f0043486fba	2026-03-19 07:35:57.631613+00	1
264	105	\N	57769.60	2026-03-18	purchases	41	Payment for purchase of 35 (item FD103)	89ada632-5a10-4fda-984f-3f0043486fba	2026-03-19 07:35:57.631997+00	1
265	103	3354.72	\N	2026-03-18	purchases	42	Purchase of 2 (item FD102)	a453d07d-2588-46d8-ab03-a78950073a08	2026-03-19 07:37:13.7282+00	1
266	105	\N	3354.72	2026-03-18	purchases	42	Payment for purchase of 2 (item FD102)	a453d07d-2588-46d8-ab03-a78950073a08	2026-03-19 07:37:13.728886+00	1
271	103	2500.20	\N	2026-03-19	purchases	45	Purchase of 60 (item FD104)	32077777-512e-45fb-ac75-72de91eaea1f	2026-03-19 08:57:14.231322+00	1
272	105	\N	2500.20	2026-03-19	purchases	45	Payment for purchase of 60 (item FD104)	32077777-512e-45fb-ac75-72de91eaea1f	2026-03-19 08:57:14.231693+00	1
273	103	1100.00	\N	2026-03-19	purchases	46	Purchase of 60 (item FD104)	e93fa54f-a0b6-4ee9-9325-9c2237f6983e	2026-03-19 08:58:22.891134+00	1
274	105	\N	1100.00	2026-03-19	purchases	46	Payment for purchase of 60 (item FD104)	e93fa54f-a0b6-4ee9-9325-9c2237f6983e	2026-03-19 08:58:22.891385+00	1
275	102	5600.00	\N	2026-03-19	purchases	47	Purchase of 20 (item MD101)	18a0d7b6-7c98-4cba-9c6d-8a091118940d	2026-03-19 09:05:37.507762+00	1
276	105	\N	5600.00	2026-03-19	purchases	47	Payment for purchase of 20 (item MD101)	18a0d7b6-7c98-4cba-9c6d-8a091118940d	2026-03-19 09:05:37.508031+00	1
277	103	95224.50	\N	2026-03-20	purchases	48	Purchase of 50 (item FD101)	20f255ed-caff-433d-81b7-27bc79a4b1f8	2026-03-20 08:07:20.194276+00	1
278	105	\N	95224.50	2026-03-20	purchases	48	Payment for purchase of 50 (item FD101)	20f255ed-caff-433d-81b7-27bc79a4b1f8	2026-03-20 08:07:20.195498+00	1
281	103	180480.00	\N	2026-03-20	purchases	50	Purchase of 100 (item FD102)	5a9e0692-07c9-42c9-ae8d-8c1e076af64f	2026-03-20 08:10:24.612551+00	1
282	105	\N	180480.00	2026-03-20	purchases	50	Payment for purchase of 100 (item FD102)	5a9e0692-07c9-42c9-ae8d-8c1e076af64f	2026-03-20 08:10:24.612922+00	1
283	103	178240.00	\N	2026-03-20	purchases	51	Purchase of 100 (item FD103)	39064a4a-a63d-4962-9dbc-a5158acf11b9	2026-03-20 08:11:42.917215+00	1
284	105	\N	178240.00	2026-03-20	purchases	51	Payment for purchase of 100 (item FD103)	39064a4a-a63d-4962-9dbc-a5158acf11b9	2026-03-20 08:11:42.917492+00	1
285	103	3000.00	\N	2026-03-20	purchases	52	Purchase of 60 (item FD104)	bc8b2673-ac84-4590-a143-e4f36569ea5e	2026-03-20 08:12:39.995187+00	1
286	105	\N	3000.00	2026-03-20	purchases	52	Payment for purchase of 60 (item FD104)	bc8b2673-ac84-4590-a143-e4f36569ea5e	2026-03-20 08:12:39.995496+00	1
287	103	14000.00	\N	2026-03-20	purchases	53	Purchase of 200 (item FD104)	28b568c4-5ef3-4150-85ee-1cc3e03e645c	2026-03-20 08:14:16.176881+00	1
288	105	\N	14000.00	2026-03-20	purchases	53	Payment for purchase of 200 (item FD104)	28b568c4-5ef3-4150-85ee-1cc3e03e645c	2026-03-20 08:14:16.177126+00	1
289	103	17041.60	\N	2026-03-20	purchases	54	Purchase of 10 (item FD102)	22783f18-3537-4e63-8e11-2be0536ddde0	2026-03-20 16:48:20.453485+00	1
290	105	\N	17041.60	2026-03-20	purchases	54	Payment for purchase of 10 (item FD102)	22783f18-3537-4e63-8e11-2be0536ddde0	2026-03-20 16:48:20.454262+00	1
291	104	78400.00	\N	2026-03-22	purchases	55	Purchase of 1428 (item SC101)	6b921da8-229d-470a-a572-3100d1d996bd	2026-03-22 14:25:36.817016+00	1
292	105	\N	78400.00	2026-03-22	purchases	55	Payment for purchase of 1428 (item SC101)	6b921da8-229d-470a-a572-3100d1d996bd	2026-03-22 14:25:36.817942+00	1
293	104	\N	78397.20	2026-03-22	batches	12	Chick allocation for batch 12 - Item: SC101	1407bcc4-c356-491b-aa6d-f26259e1f709	2026-03-22 14:26:11.059164+00	1
294	107	78397.20	\N	2026-03-22	batches	12	Chick expense for batch 12 - Item: SC101	1407bcc4-c356-491b-aa6d-f26259e1f709	2026-03-22 14:26:11.060153+00	1
295	103	\N	18776.90	2026-03-22	allocations	42	approve of (requirement 42)	c5f52190-3578-47d9-a035-9a4a213f2b0b	2026-03-22 14:27:03.585912+00	1
296	107	18776.90	\N	2026-03-22	allocations	42	Allocation of - Req #42	c5f52190-3578-47d9-a035-9a4a213f2b0b	2026-03-22 14:27:03.58664+00	1
297	103	\N	84535.00	2026-03-23	allocations	43	approve of (requirement 43)	1f27cd21-abeb-47ec-8cfc-3fe8b6c64161	2026-03-23 09:39:19.975055+00	1
298	107	84535.00	\N	2026-03-23	allocations	43	Allocation of - Req #43	1f27cd21-abeb-47ec-8cfc-3fe8b6c64161	2026-03-23 09:39:19.975817+00	1
299	103	\N	7657.62	2026-03-23	allocations	44	approve of (requirement 44)	3d266959-46e4-4ef1-ae27-71d0004b4acb	2026-03-23 09:39:44.440531+00	1
300	107	7657.62	\N	2026-03-23	allocations	44	Allocation of - Req #44	3d266959-46e4-4ef1-ae27-71d0004b4acb	2026-03-23 09:39:44.441577+00	1
301	110	68409.00	\N	2026-03-23	batch_sales	20	Sale for batch 4	ff06c048-7f30-4d05-9667-1cf66836a362	2026-03-23 09:44:19.739466+00	1
302	108	\N	68409.00	2026-03-23	batch_sales	20	Revenue from sale for batch 4	ff06c048-7f30-4d05-9667-1cf66836a362	2026-03-23 09:44:19.740547+00	1
303	110	41409.50	\N	2026-03-23	batch_sales	21	Sale for batch 4	4710328f-7909-4a92-99f2-992f5a803bdc	2026-03-23 09:44:38.588643+00	1
304	108	\N	41409.50	2026-03-23	batch_sales	21	Revenue from sale for batch 4	4710328f-7909-4a92-99f2-992f5a803bdc	2026-03-23 09:44:38.589027+00	1
305	110	98800.80	\N	2026-03-23	batch_sales	22	Sale for batch 4	b2b2e45d-26f1-4a7b-9444-67f8697136c4	2026-03-23 09:45:14.403393+00	1
306	108	\N	98800.80	2026-03-23	batch_sales	22	Revenue from sale for batch 4	b2b2e45d-26f1-4a7b-9444-67f8697136c4	2026-03-23 09:45:14.403719+00	1
307	110	165528.00	\N	2026-03-23	batch_sales	23	Sale for batch 4	2b80357a-ac56-4c07-a765-533321a52523	2026-03-23 09:45:41.501027+00	1
308	108	\N	165528.00	2026-03-23	batch_sales	23	Revenue from sale for batch 4	2b80357a-ac56-4c07-a765-533321a52523	2026-03-23 09:45:41.501384+00	1
313	110	86449.00	\N	2026-03-23	batch_sales	26	Sale for batch 4	187f842a-9a1d-400e-997d-63223891c10c	2026-03-23 09:47:41.364697+00	1
314	108	\N	86449.00	2026-03-23	batch_sales	26	Revenue from sale for batch 4	187f842a-9a1d-400e-997d-63223891c10c	2026-03-23 09:47:41.36512+00	1
315	110	1056.00	\N	2026-03-23	batch_sales	27	Sale for batch 4	84f03882-f50e-42a5-a8a5-65a9be0534e2	2026-03-23 09:48:06.871822+00	1
316	108	\N	1056.00	2026-03-23	batch_sales	27	Revenue from sale for batch 4	84f03882-f50e-42a5-a8a5-65a9be0534e2	2026-03-23 09:48:06.872268+00	1
309	110	31207.00	\N	2026-03-23	batch_sales	24	Sale for batch 4	ec4464e7-050f-45af-869e-52258f5ae71b	2026-03-23 09:46:12.382037+00	1
310	108	\N	31207.00	2026-03-23	batch_sales	24	Revenue from sale for batch 4	ec4464e7-050f-45af-869e-52258f5ae71b	2026-03-23 09:46:12.382469+00	1
311	110	92752.00	\N	2026-03-23	batch_sales	25	Sale for batch 4	c95fe369-edd3-4767-88d4-1907adb87766	2026-03-23 09:46:35.545189+00	1
312	108	\N	92752.00	2026-03-23	batch_sales	25	Revenue from sale for batch 4	c95fe369-edd3-4767-88d4-1907adb87766	2026-03-23 09:46:35.5472+00	1
319	103	\N	122051.76	2026-03-23	allocations	45	approve of (requirement 45)	8a445fa2-05d3-4b39-aea7-c4e4f9c51a05	2026-03-23 11:28:23.743859+00	1
320	107	122051.76	\N	2026-03-23	allocations	45	Allocation of - Req #45	8a445fa2-05d3-4b39-aea7-c4e4f9c51a05	2026-03-23 11:28:23.745749+00	1
321	103	\N	97200.12	2026-03-23	allocations	46	approve of (requirement 46)	22138a91-204e-4bfc-ae8a-66efe81e5987	2026-03-23 11:28:27.039585+00	1
322	107	97200.12	\N	2026-03-23	allocations	46	Allocation of - Req #46	22138a91-204e-4bfc-ae8a-66efe81e5987	2026-03-23 11:28:27.040747+00	1
323	103	\N	14167.98	2026-03-23	allocations	47	approve of (requirement 47)	e957bb9b-9639-48c8-b1e7-7da928ad2648	2026-03-23 11:28:42.136558+00	1
324	107	14167.98	\N	2026-03-23	allocations	47	Allocation of - Req #47	e957bb9b-9639-48c8-b1e7-7da928ad2648	2026-03-23 11:28:42.136855+00	1
325	110	98068.50	\N	2026-03-23	batch_sales	28	Sale for batch 3	cb0fc1d2-614f-4ae7-9a34-447c29ec07a7	2026-03-23 11:32:31.724068+00	1
326	108	\N	98068.50	2026-03-23	batch_sales	28	Revenue from sale for batch 3	cb0fc1d2-614f-4ae7-9a34-447c29ec07a7	2026-03-23 11:32:31.724774+00	1
327	110	51619.20	\N	2026-03-23	batch_sales	29	Sale for batch 3	a2ca5d3e-79ea-46b9-a572-7583f4e40949	2026-03-23 11:33:01.763295+00	1
328	108	\N	51619.20	2026-03-23	batch_sales	29	Revenue from sale for batch 3	a2ca5d3e-79ea-46b9-a572-7583f4e40949	2026-03-23 11:33:01.763851+00	1
329	110	81755.10	\N	2026-03-23	batch_sales	30	Sale for batch 3	114c11ba-d9fd-48f8-8ad0-c0a29253694e	2026-03-23 11:33:37.522768+00	1
330	108	\N	81755.10	2026-03-23	batch_sales	30	Revenue from sale for batch 3	114c11ba-d9fd-48f8-8ad0-c0a29253694e	2026-03-23 11:33:37.524977+00	1
331	110	60285.50	\N	2026-03-23	batch_sales	31	Sale for batch 3	2dbf7970-ae40-472b-ac11-275f6709a5d0	2026-03-23 11:34:34.398778+00	1
332	108	\N	60285.50	2026-03-23	batch_sales	31	Revenue from sale for batch 3	2dbf7970-ae40-472b-ac11-275f6709a5d0	2026-03-23 11:34:34.400085+00	1
333	110	114803.70	\N	2026-03-23	batch_sales	32	Sale for batch 3	e17b219d-05a7-4931-9776-42f85a10a042	2026-03-23 11:35:53.616289+00	1
334	108	\N	114803.70	2026-03-23	batch_sales	32	Revenue from sale for batch 3	e17b219d-05a7-4931-9776-42f85a10a042	2026-03-23 11:35:53.617965+00	1
335	110	76516.80	\N	2026-03-23	batch_sales	33	Sale for batch 3	6a578cd7-80e7-4c7c-b262-f2d46323c907	2026-03-23 11:36:34.474655+00	1
336	108	\N	76516.80	2026-03-23	batch_sales	33	Revenue from sale for batch 3	6a578cd7-80e7-4c7c-b262-f2d46323c907	2026-03-23 11:36:34.475078+00	1
337	110	76899.20	\N	2026-03-23	batch_sales	34	Sale for batch 3	dcffb432-49fc-48fd-927b-76838eec1e23	2026-03-23 11:37:05.316383+00	1
338	108	\N	76899.20	2026-03-23	batch_sales	34	Revenue from sale for batch 3	dcffb432-49fc-48fd-927b-76838eec1e23	2026-03-23 11:37:05.316717+00	1
339	110	73235.30	\N	2026-03-23	batch_sales	35	Sale for batch 3	9867ed74-314e-42ef-a8b9-a171b8a1fd97	2026-03-23 11:37:43.604677+00	1
340	108	\N	73235.30	2026-03-23	batch_sales	35	Revenue from sale for batch 3	9867ed74-314e-42ef-a8b9-a171b8a1fd97	2026-03-23 11:37:43.606073+00	1
341	110	39336.00	\N	2026-03-23	batch_sales	36	Sale for batch 3	3a467e40-9b1a-4bed-8c5b-9c217764f411	2026-03-23 11:38:07.233866+00	1
342	108	\N	39336.00	2026-03-23	batch_sales	36	Revenue from sale for batch 3	3a467e40-9b1a-4bed-8c5b-9c217764f411	2026-03-23 11:38:07.234487+00	1
343	110	1290.00	\N	2026-03-23	batch_sales	37	Sale for batch 3	27a463a5-01ec-4f5e-9291-e9e98c85efe3	2026-03-23 11:38:24.938802+00	1
344	108	\N	1290.00	2026-03-23	batch_sales	37	Revenue from sale for batch 3	27a463a5-01ec-4f5e-9291-e9e98c85efe3	2026-03-23 11:38:24.939211+00	1
345	110	12562.00	\N	2026-03-23	batch_sales	38	Sale for batch 3	2ff1ff45-ec47-49ad-991e-7e2073e3f45f	2026-03-23 11:38:44.805826+00	1
346	108	\N	12562.00	2026-03-23	batch_sales	38	Revenue from sale for batch 3	2ff1ff45-ec47-49ad-991e-7e2073e3f45f	2026-03-23 11:38:44.806659+00	1
347	110	2808.00	\N	2026-03-23	batch_sales	39	Sale for batch 3	b37374d1-cc59-4cdd-8662-110949baac3e	2026-03-23 11:39:04.060943+00	1
348	108	\N	2808.00	2026-03-23	batch_sales	39	Revenue from sale for batch 3	b37374d1-cc59-4cdd-8662-110949baac3e	2026-03-23 11:39:04.061683+00	1
349	106	43537.00	\N	2026-03-24	farmer_commission_history	3	Farmer commission debit	fa2fb933-6328-4acc-bafc-e5d8c7bf0685	2026-03-24 05:42:36.451248+00	1
350	101	\N	43537.00	2026-03-24	farmer_commission_history	3	Cash paid for farmer commission	fa2fb933-6328-4acc-bafc-e5d8c7bf0685	2026-03-24 05:42:36.451248+00	1
351	106	20038.00	\N	2026-03-24	farmer_commission_history	4	Farmer commission debit	58d55993-6e88-4a52-8981-935ddf15b9fe	2026-03-24 05:43:10.090337+00	1
352	101	\N	20038.00	2026-03-24	farmer_commission_history	4	Cash paid for farmer commission	58d55993-6e88-4a52-8981-935ddf15b9fe	2026-03-24 05:43:10.090337+00	1
353	103	\N	67094.40	2026-03-24	allocations	48	approve of (requirement 48)	cba80ffb-a7c1-4ebb-ac81-68bc889c9f37	2026-03-24 12:54:56.694302+00	1
354	107	67094.40	\N	2026-03-24	allocations	48	Allocation of - Req #48	cba80ffb-a7c1-4ebb-ac81-68bc889c9f37	2026-03-24 12:54:56.695015+00	1
355	103	\N	44355.36	2026-03-24	allocations	49	approve of (requirement 49)	39384598-dd98-4d4a-a2ad-abc7709e160c	2026-03-24 12:57:29.622847+00	1
356	107	44355.36	\N	2026-03-24	allocations	49	Allocation of - Req #49	39384598-dd98-4d4a-a2ad-abc7709e160c	2026-03-24 12:57:29.624085+00	1
357	110	\N	40626.00	2026-03-24	trader_payments	11	Received from Trader #1	5aac287b-e266-4ae1-a20b-e29c0d8366b3	2026-03-24 13:00:51.182877+00	1
358	101	40626.00	\N	2026-03-24	trader_payments	11	Payment Ref: Some("")	5aac287b-e266-4ae1-a20b-e29c0d8366b3	2026-03-24 13:00:51.183283+00	1
359	110	\N	186717.70	2026-03-24	trader_payments	12	Received from Trader #2	ae02294a-ff74-43bb-89d2-e3ebcc63a43b	2026-03-24 13:01:15.237137+00	1
360	101	186717.70	\N	2026-03-24	trader_payments	12	Payment Ref: Some("")	ae02294a-ff74-43bb-89d2-e3ebcc63a43b	2026-03-24 13:01:15.237859+00	1
361	110	\N	169260.10	2026-03-24	trader_payments	13	Received from Trader #3	c0f62ff6-5380-430a-8f2f-825ffd29de89	2026-03-24 13:01:41.759925+00	1
362	101	169260.10	\N	2026-03-24	trader_payments	13	Payment Ref: Some("")	c0f62ff6-5380-430a-8f2f-825ffd29de89	2026-03-24 13:01:41.760558+00	1
363	110	\N	31207.00	2026-03-24	trader_payments	14	Received from Trader #11	1b2e3635-1ae3-4916-a789-3b23002baa9a	2026-03-24 13:02:02.604781+00	1
364	101	31207.00	\N	2026-03-24	trader_payments	14	Payment Ref: Some("")	1b2e3635-1ae3-4916-a789-3b23002baa9a	2026-03-24 13:02:02.605248+00	1
365	110	\N	203409.00	2026-03-24	trader_payments	15	Received from Trader #14	abbf4b31-b872-40a8-90fc-70272217cf8f	2026-03-24 13:02:20.131291+00	1
366	101	203409.00	\N	2026-03-24	trader_payments	15	Payment Ref: Some("")	abbf4b31-b872-40a8-90fc-70272217cf8f	2026-03-24 13:02:20.132314+00	1
367	110	\N	60285.50	2026-03-24	trader_payments	16	Received from Trader #13	d514f701-9b7f-4952-a473-8f9aa7e1d9b2	2026-03-24 13:02:34.269245+00	1
368	101	60285.50	\N	2026-03-24	trader_payments	16	Payment Ref: Some("")	d514f701-9b7f-4952-a473-8f9aa7e1d9b2	2026-03-24 13:02:34.270104+00	1
369	110	\N	242044.80	2026-03-24	trader_payments	17	Received from Trader #7	c20a65f9-8e64-443c-bb7a-74697968a10c	2026-03-24 14:31:49.502367+00	1
370	101	242044.80	\N	2026-03-24	trader_payments	17	Payment Ref: Some("")	c20a65f9-8e64-443c-bb7a-74697968a10c	2026-03-24 14:31:49.504573+00	1
371	110	\N	98068.50	2026-03-24	trader_payments	18	Received from Trader #12	2df1bf38-524b-43c1-bbd8-f04bce31c36d	2026-03-24 14:32:05.187031+00	1
372	101	98068.50	\N	2026-03-24	trader_payments	18	Payment Ref: Some("")	2df1bf38-524b-43c1-bbd8-f04bce31c36d	2026-03-24 14:32:05.188999+00	1
373	110	\N	98800.80	2026-03-24	trader_payments	19	Received from Trader #5	4727a601-f2bd-4c7a-a3cf-862eabbb8531	2026-03-24 14:32:28.854658+00	1
374	101	98800.80	\N	2026-03-24	trader_payments	19	Payment Ref: Some("")	4727a601-f2bd-4c7a-a3cf-862eabbb8531	2026-03-24 14:32:28.856143+00	1
375	110	\N	144371.20	2026-03-24	trader_payments	20	Received from Trader #4	0b007920-3315-49b6-8854-5439c77daade	2026-03-24 14:32:44.805283+00	1
376	101	144371.20	\N	2026-03-24	trader_payments	20	Payment Ref: Some("")	0b007920-3315-49b6-8854-5439c77daade	2026-03-24 14:32:44.80666+00	1
377	103	102250.00	\N	2026-03-22	purchases	56	Purchase of 60 (item FD102)	372ddbe2-bd7d-4eca-87a7-fb8c9c426416	2026-03-25 04:25:45.168157+00	1
378	105	\N	102250.00	2026-03-22	purchases	56	Payment for purchase of 60 (item FD102)	372ddbe2-bd7d-4eca-87a7-fb8c9c426416	2026-03-25 04:25:45.169293+00	1
381	105	324327.69	\N	2026-03-25	supplier_payments	20	Payment to Supplier #2	064df96d-3224-4b23-a49d-bdb53d3cb835	2026-03-25 08:05:15.997635+00	1
382	101	\N	324327.69	2026-03-25	supplier_payments	20	Payment Ref: Some("")	064df96d-3224-4b23-a49d-bdb53d3cb835	2026-03-25 08:05:15.998078+00	1
383	105	131100.00	\N	2026-03-25	supplier_payments	21	Payment to Supplier #6	8ab793c5-b5b4-4b96-93ff-aea89dd0165e	2026-03-25 08:05:37.127494+00	1
384	101	\N	131100.00	2026-03-25	supplier_payments	21	Payment Ref: Some("")	8ab793c5-b5b4-4b96-93ff-aea89dd0165e	2026-03-25 08:05:37.128606+00	1
385	105	78400.00	\N	2026-03-25	supplier_payments	22	Payment to Supplier #7	b88289a7-761a-45cf-9951-72a004dc0374	2026-03-25 08:05:50.615868+00	1
386	101	\N	78400.00	2026-03-25	supplier_payments	22	Payment Ref: Some("")	b88289a7-761a-45cf-9951-72a004dc0374	2026-03-25 08:05:50.616219+00	1
387	105	373820.00	\N	2026-03-25	supplier_payments	23	Payment to Supplier #11	dd5ae940-8d18-4592-bb48-f02688a81fe3	2026-03-25 08:06:04.566303+00	1
388	101	\N	373820.00	2026-03-25	supplier_payments	23	Payment Ref: Some("")	dd5ae940-8d18-4592-bb48-f02688a81fe3	2026-03-25 08:06:04.56695+00	1
389	104	106400.00	\N	2026-03-26	purchases	57	Purchase of 1922 (item SC101)	3f61b07b-e4e1-4c0b-9f64-cdb4aea240fb	2026-03-26 12:18:06.873889+00	1
390	105	\N	106400.00	2026-03-26	purchases	57	Payment for purchase of 1922 (item SC101)	3f61b07b-e4e1-4c0b-9f64-cdb4aea240fb	2026-03-26 12:18:06.874903+00	1
391	104	\N	106401.92	2026-03-26	batches	13	Chick allocation for batch 13 - Item: SC101	afe77a8d-439d-4846-97ff-1cf9539f0583	2026-03-26 12:20:30.160793+00	1
392	107	106401.92	\N	2026-03-26	batches	13	Chick expense for batch 13 - Item: SC101	afe77a8d-439d-4846-97ff-1cf9539f0583	2026-03-26 12:20:30.162917+00	1
393	103	\N	50697.63	2026-03-26	allocations	51	approve of (requirement 51)	515c2efb-1abd-41f8-9b30-a05800a783e2	2026-03-26 12:22:06.326485+00	1
394	107	50697.63	\N	2026-03-26	allocations	51	Allocation of - Req #51	515c2efb-1abd-41f8-9b30-a05800a783e2	2026-03-26 12:22:06.32684+00	1
395	104	78400.00	\N	2026-03-26	purchases	58	Purchase of 1422 (item SC101)	77c86060-31ff-4a6d-9447-42e2fe9c1ca2	2026-03-26 12:23:57.985399+00	1
396	105	\N	78400.00	2026-03-26	purchases	58	Payment for purchase of 1422 (item SC101)	77c86060-31ff-4a6d-9447-42e2fe9c1ca2	2026-03-26 12:23:57.986752+00	1
397	104	\N	78394.86	2026-03-26	batches	14	Chick allocation for batch 14 - Item: SC101	67b2281a-aaca-42a1-b908-ea613875adff	2026-03-26 12:24:30.216932+00	1
398	107	78394.86	\N	2026-03-26	batches	14	Chick expense for batch 14 - Item: SC101	67b2281a-aaca-42a1-b908-ea613875adff	2026-03-26 12:24:30.217358+00	1
399	103	\N	24677.97	2026-03-26	allocations	53	approve of (requirement 53)	afdb6c42-51df-4759-9ccf-c1f2a10ccf0e	2026-03-26 12:25:23.927052+00	1
400	107	24677.97	\N	2026-03-26	allocations	53	Allocation of - Req #53	afdb6c42-51df-4759-9ccf-c1f2a10ccf0e	2026-03-26 12:25:23.92754+00	1
401	105	78400.00	\N	2026-03-26	supplier_payments	24	Payment to Supplier #13	24b07aab-108c-4269-b9b8-e0e037da402b	2026-03-26 12:26:32.422333+00	1
402	101	\N	78400.00	2026-03-26	supplier_payments	24	Payment Ref: Some("2885")	24b07aab-108c-4269-b9b8-e0e037da402b	2026-03-26 12:26:32.422825+00	1
403	105	106400.00	\N	2026-03-26	supplier_payments	25	Payment to Supplier #7	7b12a99f-2e52-41b0-a21f-35f37c3c9a21	2026-03-26 12:26:44.763844+00	1
404	101	\N	106400.00	2026-03-26	supplier_payments	25	Payment Ref: Some("")	7b12a99f-2e52-41b0-a21f-35f37c3c9a21	2026-03-26 12:26:44.764218+00	1
405	105	5600.00	\N	2026-03-26	supplier_payments	26	Payment to Supplier #8	bec24fc7-9f37-4704-96b3-10276523b2fd	2026-03-26 12:26:54.540689+00	1
406	101	\N	5600.00	2026-03-26	supplier_payments	26	Payment Ref: Some("")	bec24fc7-9f37-4704-96b3-10276523b2fd	2026-03-26 12:26:54.541814+00	1
407	104	111500.00	\N	2026-03-28	purchases	59	Purchase of 2025 (item SC101)	acd077c5-e045-4e3c-9b3e-c2c2783ac820	2026-03-28 05:59:42.634133+00	1
408	105	\N	111500.00	2026-03-28	purchases	59	Payment for purchase of 2025 (item SC101)	acd077c5-e045-4e3c-9b3e-c2c2783ac820	2026-03-28 05:59:42.635805+00	1
409	104	\N	111496.50	2026-03-28	batches	15	Chick allocation for batch 15 - Item: SC101	291bf050-caca-4ae5-bb3f-8dc578010b4e	2026-03-28 05:59:58.499594+00	1
410	107	111496.50	\N	2026-03-28	batches	15	Chick expense for batch 15 - Item: SC101	291bf050-caca-4ae5-bb3f-8dc578010b4e	2026-03-28 05:59:58.500024+00	1
411	103	\N	38089.80	2026-03-28	allocations	55	approve of (requirement 55)	06f96883-9722-489f-91ef-519f9d33da6f	2026-03-28 06:00:33.34342+00	1
412	107	38089.80	\N	2026-03-28	allocations	55	Allocation of - Req #55	06f96883-9722-489f-91ef-519f9d33da6f	2026-03-28 06:00:33.344502+00	1
413	103	114269.40	\N	2026-03-28	purchases	60	Purchase of 60 (item FD101)	29e15ab8-8491-4f14-8388-0ab71126280e	2026-03-28 06:52:05.971655+00	1
414	105	\N	114269.40	2026-03-28	purchases	60	Payment for purchase of 60 (item FD101)	29e15ab8-8491-4f14-8388-0ab71126280e	2026-03-28 06:52:05.972805+00	1
415	103	3000.00	\N	2026-03-28	purchases	61	Purchase of 60 (item FD104)	b624afb5-323b-476c-9ecc-e08bee73c0ab	2026-03-28 06:53:02.699805+00	1
416	105	\N	3000.00	2026-03-28	purchases	61	Payment for purchase of 60 (item FD104)	b624afb5-323b-476c-9ecc-e08bee73c0ab	2026-03-28 06:53:02.700097+00	1
417	103	102250.20	\N	2026-03-30	purchases	62	Purchase of 60 (item FD102)	4a5cd93b-7874-4b02-9a09-d119fe77b8b1	2026-03-30 05:08:17.502299+00	1
418	105	\N	102250.20	2026-03-30	purchases	62	Payment for purchase of 60 (item FD102)	4a5cd93b-7874-4b02-9a09-d119fe77b8b1	2026-03-30 05:08:17.503408+00	1
419	103	3000.00	\N	2026-03-30	purchases	63	Purchase of 60 (item FD104)	13107683-a0df-431f-a104-cc9cd0efbd86	2026-03-30 05:08:45.802694+00	1
420	105	\N	3000.00	2026-03-30	purchases	63	Payment for purchase of 60 (item FD104)	13107683-a0df-431f-a104-cc9cd0efbd86	2026-03-30 05:08:45.803015+00	1
421	103	\N	43803.27	2026-03-30	allocations	56	approve of (requirement 56)	46e2611b-1b37-41d4-9626-80eb174290d7	2026-03-30 08:40:05.259652+00	1
422	107	43803.27	\N	2026-03-30	allocations	56	Allocation of - Req #56	46e2611b-1b37-41d4-9626-80eb174290d7	2026-03-30 08:40:05.260278+00	1
423	103	\N	48729.60	2026-03-30	allocations	57	approve of (requirement 57)	56cc9788-de88-471f-bdd6-c220b8ae9185	2026-03-30 08:40:19.362409+00	1
424	107	48729.60	\N	2026-03-30	allocations	57	Allocation of - Req #57	56cc9788-de88-471f-bdd6-c220b8ae9185	2026-03-30 08:40:19.363128+00	1
425	103	\N	72192.00	2026-03-30	allocations	58	approve of (requirement 58)	c7a5e265-6c29-4d9b-b94b-ffc91cebd08b	2026-03-30 08:41:13.160556+00	1
426	107	72192.00	\N	2026-03-30	allocations	58	Allocation of - Req #58	c7a5e265-6c29-4d9b-b94b-ffc91cebd08b	2026-03-30 08:41:13.160882+00	1
427	103	\N	9522.45	2026-03-30	allocations	59	approve of (requirement 59)	42d6507a-21ef-4e67-ac7e-d18112f4253e	2026-03-30 08:44:59.893595+00	1
428	107	9522.45	\N	2026-03-30	allocations	59	Allocation of - Req #59	42d6507a-21ef-4e67-ac7e-d18112f4253e	2026-03-30 08:44:59.894248+00	1
429	103	\N	129221.47	2026-03-30	allocations	60	approve of (requirement 60)	3f60d4d1-8533-4ffd-8776-da41e53f2e81	2026-03-30 08:45:03.369763+00	1
430	107	129221.47	\N	2026-03-30	allocations	60	Allocation of - Req #60	3f60d4d1-8533-4ffd-8776-da41e53f2e81	2026-03-30 08:45:03.370481+00	1
431	103	\N	59645.95	2026-03-30	allocations	61	approve of (requirement 61)	ccb5c686-4a94-4551-8f0a-b39aa1046a78	2026-03-30 08:46:13.998083+00	1
432	107	59645.95	\N	2026-03-30	allocations	61	Allocation of - Req #61	ccb5c686-4a94-4551-8f0a-b39aa1046a78	2026-03-30 08:46:13.998902+00	1
433	103	\N	106622.08	2026-03-30	allocations	62	approve of (requirement 62)	bed0cf7d-e3b9-484d-b405-1cf48c55bfbb	2026-03-30 08:46:15.976111+00	1
434	107	106622.08	\N	2026-03-30	allocations	62	Allocation of - Req #62	bed0cf7d-e3b9-484d-b405-1cf48c55bfbb	2026-03-30 08:46:15.976641+00	1
435	103	\N	133680.00	2026-03-30	allocations	63	approve of (requirement 64)	7310cb7b-9c5a-4e83-a8bc-71f201997191	2026-03-30 08:48:17.229676+00	1
436	107	133680.00	\N	2026-03-30	allocations	63	Allocation of - Req #64	7310cb7b-9c5a-4e83-a8bc-71f201997191	2026-03-30 08:48:17.230048+00	1
437	103	18776.90	\N	2026-03-30	stock_returns	4	Stock return for allocation line 68	0fee0b5e-dd77-448e-804e-59d145b57757	2026-03-30 13:48:01.503396+00	1
438	107	\N	18776.90	2026-03-30	stock_returns	4	Return reversal for allocation line 68	0fee0b5e-dd77-448e-804e-59d145b57757	2026-03-30 13:48:01.504387+00	1
439	103	\N	17041.70	2026-03-30	allocations	64	approve of (requirement 65)	523768f0-d7ec-4b54-88dd-91089b123dde	2026-03-30 13:48:41.415466+00	1
440	107	17041.70	\N	2026-03-30	allocations	64	Allocation of - Req #65	523768f0-d7ec-4b54-88dd-91089b123dde	2026-03-30 13:48:41.41705+00	1
443	104	210768.00	\N	2026-03-27	purchases	64	Purchase of 3718 (item SC101)	8e631fd8-2253-49ab-b3de-b30721a0c288	2026-03-30 14:04:31.795763+00	1
444	105	\N	210768.00	2026-03-27	purchases	64	Payment for purchase of 3718 (item SC101)	8e631fd8-2253-49ab-b3de-b30721a0c288	2026-03-30 14:04:31.796513+00	1
445	104	\N	210773.42	2026-03-30	batches	16	Chick allocation for batch 16 - Item: SC101	b8ce9f33-b243-4e4c-86d5-3072ad698c27	2026-03-30 14:06:32.157679+00	1
446	107	210773.42	\N	2026-03-30	batches	16	Chick expense for batch 16 - Item: SC101	b8ce9f33-b243-4e4c-86d5-3072ad698c27	2026-03-30 14:06:32.157966+00	1
447	103	61363.20	\N	2026-03-30	purchases	65	Purchase of 34 (item FD102)	3e73726c-7a2b-46e0-8b14-9e161a6967ed	2026-03-30 14:09:34.382455+00	1
448	105	\N	61363.20	2026-03-30	purchases	65	Payment for purchase of 34 (item FD102)	3e73726c-7a2b-46e0-8b14-9e161a6967ed	2026-03-30 14:09:34.382878+00	1
449	103	\N	59954.38	2026-03-30	allocations	67	approve of (requirement 67)	8b20a0fe-b319-46cf-9d4e-3ee4719021d5	2026-03-30 14:10:15.353744+00	1
450	107	59954.38	\N	2026-03-30	allocations	67	Allocation of - Req #67	8b20a0fe-b319-46cf-9d4e-3ee4719021d5	2026-03-30 14:10:15.355327+00	1
451	103	33865.60	\N	2026-03-30	purchases	66	Purchase of 19 (item FD103)	ca4d95c6-3478-40e1-83c3-31cf6d6d6102	2026-03-30 14:11:05.202717+00	1
452	105	\N	33865.60	2026-03-30	purchases	66	Payment for purchase of 19 (item FD103)	ca4d95c6-3478-40e1-83c3-31cf6d6d6102	2026-03-30 14:11:05.203426+00	1
453	103	\N	42777.60	2026-03-30	allocations	68	approve of (requirement 68)	9c97f154-f554-4531-9392-9c693df12178	2026-03-30 14:11:18.956123+00	1
454	107	42777.60	\N	2026-03-30	allocations	68	Allocation of - Req #68	9c97f154-f554-4531-9392-9c693df12178	2026-03-30 14:11:18.957274+00	1
455	103	\N	7800.15	2026-03-30	allocations	69	approve of (requirement 69)	c2fc3ccc-a91a-4432-81de-f60bbeda1237	2026-03-30 14:11:56.115296+00	1
456	107	7800.15	\N	2026-03-30	allocations	69	Allocation of - Req #69	c2fc3ccc-a91a-4432-81de-f60bbeda1237	2026-03-30 14:11:56.115534+00	1
457	102	2450.00	\N	2026-03-30	purchases	67	Purchase of 245 (item MD101)	368fc666-227c-43b9-b3d1-cc585d202e0e	2026-03-30 14:13:52.406024+00	1
458	105	\N	2450.00	2026-03-30	purchases	67	Payment for purchase of 245 (item MD101)	368fc666-227c-43b9-b3d1-cc585d202e0e	2026-03-30 14:13:52.406416+00	1
459	102	\N	2800.00	2026-03-30	allocations	70	approve of (requirement 70)	5f3de49d-9709-428b-9961-134a165f525b	2026-03-30 14:14:03.577801+00	1
460	107	2800.00	\N	2026-03-30	allocations	70	Allocation of - Req #70	5f3de49d-9709-428b-9961-134a165f525b	2026-03-30 14:14:03.578361+00	1
461	110	93031.15	\N	2026-03-30	batch_sales	40	Sale for batch 5	e17d8503-64e7-431b-b884-d0d3811f62ad	2026-03-30 14:19:03.836309+00	1
462	108	\N	93031.15	2026-03-30	batch_sales	40	Revenue from sale for batch 5	e17d8503-64e7-431b-b884-d0d3811f62ad	2026-03-30 14:19:03.837629+00	1
463	110	156657.40	\N	2026-03-30	batch_sales	41	Sale for batch 5	ea9a4247-e599-4f4d-b593-5bda956f6e54	2026-03-30 14:22:44.80252+00	1
464	108	\N	156657.40	2026-03-30	batch_sales	41	Revenue from sale for batch 5	ea9a4247-e599-4f4d-b593-5bda956f6e54	2026-03-30 14:22:44.803389+00	1
465	110	102119.40	\N	2026-03-30	batch_sales	42	Sale for batch 5	d4a2df15-92ac-435a-8368-dfd19af7a3c6	2026-03-30 14:23:09.370091+00	1
466	108	\N	102119.40	2026-03-30	batch_sales	42	Revenue from sale for batch 5	d4a2df15-92ac-435a-8368-dfd19af7a3c6	2026-03-30 14:23:09.370521+00	1
467	110	8358.10	\N	2026-03-30	batch_sales	43	Sale for batch 5	f4c61b2c-90ef-48e4-b2fb-2e7bc89d024e	2026-03-30 14:23:44.076515+00	1
468	108	\N	8358.10	2026-03-30	batch_sales	43	Revenue from sale for batch 5	f4c61b2c-90ef-48e4-b2fb-2e7bc89d024e	2026-03-30 14:23:44.076884+00	1
469	110	6050.00	\N	2026-03-30	batch_sales	44	Sale for batch 5	9cad0cc3-b40b-4798-8a11-a606f4c4f831	2026-03-30 14:24:33.563317+00	1
470	108	\N	6050.00	2026-03-30	batch_sales	44	Revenue from sale for batch 5	9cad0cc3-b40b-4798-8a11-a606f4c4f831	2026-03-30 14:24:33.564007+00	1
471	110	7602.00	\N	2026-03-30	batch_sales	45	Sale for batch 5	7aea0858-7f64-4e7e-9b91-e31ca1c4faff	2026-03-30 14:25:15.845056+00	1
472	108	\N	7602.00	2026-03-30	batch_sales	45	Revenue from sale for batch 5	7aea0858-7f64-4e7e-9b91-e31ca1c4faff	2026-03-30 14:25:15.845676+00	1
473	110	1.00	\N	2026-03-30	batch_sales	46	Sale for batch 5	f8b3ce74-ad44-4f72-9a4e-afeacef54c1f	2026-03-30 14:26:05.344971+00	1
474	108	\N	1.00	2026-03-30	batch_sales	46	Revenue from sale for batch 5	f8b3ce74-ad44-4f72-9a4e-afeacef54c1f	2026-03-30 14:26:05.347264+00	1
475	103	\N	72102.62	2026-03-30	allocations	71	approve of (requirement 71)	cce6d442-1013-4b46-a507-b2ceba7f523b	2026-03-30 14:27:57.894319+00	1
476	107	72102.62	\N	2026-03-30	allocations	71	Allocation of - Req #71	cce6d442-1013-4b46-a507-b2ceba7f523b	2026-03-30 14:27:57.89531+00	1
477	103	64758.46	\N	2026-03-30	purchases	68	Purchase of 38 (item FD102)	a82b42d5-3551-4e7e-82ba-8f26a26c1247	2026-03-30 14:34:17.082656+00	1
478	105	\N	64758.46	2026-03-30	purchases	68	Payment for purchase of 38 (item FD102)	a82b42d5-3551-4e7e-82ba-8f26a26c1247	2026-03-30 14:34:17.083511+00	1
479	103	\N	90025.66	2026-03-30	allocations	72	approve of (requirement 72)	96e94517-beeb-41c9-a791-244bb5e55e85	2026-03-30 14:38:15.893502+00	1
480	107	90025.66	\N	2026-03-30	allocations	72	Allocation of - Req #72	96e94517-beeb-41c9-a791-244bb5e55e85	2026-03-30 14:38:15.894004+00	1
481	105	210768.00	\N	2026-03-30	supplier_payments	27	Payment to Supplier #2	58227390-9715-43bd-868d-fda998df5bc6	2026-03-30 14:59:51.914646+00	1
482	101	\N	210768.00	2026-03-30	supplier_payments	27	Payment Ref: Some("5253467924")	58227390-9715-43bd-868d-fda998df5bc6	2026-03-30 14:59:51.915605+00	1
483	105	11751.60	\N	2026-03-30	supplier_payments	28	Payment to Supplier #2	f615b058-3095-4ac8-a6e2-b880dbdbd0ae	2026-03-30 15:00:16.874184+00	1
484	101	\N	11751.60	2026-03-30	supplier_payments	28	Payment Ref: Some("1")	f615b058-3095-4ac8-a6e2-b880dbdbd0ae	2026-03-30 15:00:16.875502+00	1
485	105	210768.00	\N	2026-03-30	supplier_payments	29	Payment to Supplier #7	e9567049-0ea1-4275-abce-f566e3c524f3	2026-03-30 15:00:44.844895+00	1
486	101	\N	210768.00	2026-03-30	supplier_payments	29	Payment Ref: Some("")	e9567049-0ea1-4275-abce-f566e3c524f3	2026-03-30 15:00:44.846283+00	1
487	105	2450.00	\N	2026-03-30	supplier_payments	30	Payment to Supplier #10	efd202fc-e4da-4b06-b9ea-f6115a1432a6	2026-03-30 15:00:55.164412+00	1
488	101	\N	2450.00	2026-03-30	supplier_payments	30	Payment Ref: Some("")	efd202fc-e4da-4b06-b9ea-f6115a1432a6	2026-03-30 15:00:55.165095+00	1
489	110	\N	116500.00	2026-04-01	trader_payments	21	Received from Trader #3	b3becb3a-c983-4bb1-8f1b-1d81b43f01f9	2026-04-01 07:47:09.419144+00	1
490	101	116500.00	\N	2026-04-01	trader_payments	21	Payment Ref: Some("")	b3becb3a-c983-4bb1-8f1b-1d81b43f01f9	2026-04-01 07:47:09.420886+00	1
491	110	\N	27.50	2026-04-01	trader_payments	22	Received from Trader #3	71836c15-bb30-4e20-95cb-cc967af85b10	2026-04-01 07:47:35.260057+00	1
492	101	27.50	\N	2026-04-01	trader_payments	22	Payment Ref: Some("")	71836c15-bb30-4e20-95cb-cc967af85b10	2026-04-01 07:47:35.261158+00	1
493	110	\N	68885.00	2026-04-01	trader_payments	23	Received from Trader #7	4e3953b1-80d8-446b-8f74-6e0bcbc13f27	2026-04-01 07:48:48.278041+00	1
494	101	68885.00	\N	2026-04-01	trader_payments	23	Payment Ref: Some("")	4e3953b1-80d8-446b-8f74-6e0bcbc13f27	2026-04-01 07:48:48.278405+00	1
495	110	\N	7602.00	2026-04-01	trader_payments	24	Received from Trader #10	cdfc26b8-fd18-4c2d-a063-8a47a4608349	2026-04-01 07:49:07.194329+00	1
496	101	7602.00	\N	2026-04-01	trader_payments	24	Payment Ref: Some("")	cdfc26b8-fd18-4c2d-a063-8a47a4608349	2026-04-01 07:49:07.194798+00	1
497	110	\N	93031.15	2026-04-01	trader_payments	25	Received from Trader #14	d2684016-6c94-4fe1-ba94-59b4bfc4f978	2026-04-01 07:51:37.93161+00	1
498	101	93031.15	\N	2026-04-01	trader_payments	25	Payment Ref: Some("")	d2684016-6c94-4fe1-ba94-59b4bfc4f978	2026-04-01 07:51:37.931857+00	1
499	105	159987.26	\N	2026-04-01	supplier_payments	31	Payment to Supplier #11	febd851b-18fd-4876-8416-f620011e9786	2026-04-01 07:52:17.308285+00	1
500	101	\N	159987.26	2026-04-01	supplier_payments	31	Payment Ref: Some("")	febd851b-18fd-4876-8416-f620011e9786	2026-04-01 07:52:17.308539+00	1
501	105	111500.00	\N	2026-04-01	supplier_payments	32	Payment to Supplier #13	27d1b5e2-b3da-4918-9e23-4f213ef7c50e	2026-04-01 07:52:33.607958+00	1
502	101	\N	111500.00	2026-04-01	supplier_payments	32	Payment Ref: Some("")	27d1b5e2-b3da-4918-9e23-4f213ef7c50e	2026-04-01 07:52:33.60826+00	1
503	103	85200.00	\N	2026-04-01	purchases	69	Purchase of 50 (item FD102)	db550153-80db-4b4d-a7cc-bee6dfcaf2c7	2026-04-02 15:40:21.49122+00	1
504	105	\N	85200.00	2026-04-01	purchases	69	Payment for purchase of 50 (item FD102)	db550153-80db-4b4d-a7cc-bee6dfcaf2c7	2026-04-02 15:40:21.492368+00	1
505	103	2500.00	\N	2026-04-01	purchases	70	Purchase of 50 (item FD104)	649c0a5b-bb0d-4a6e-bf31-527c1799d01f	2026-04-02 15:41:16.187247+00	1
506	105	\N	2500.00	2026-04-01	purchases	70	Payment for purchase of 50 (item FD104)	649c0a5b-bb0d-4a6e-bf31-527c1799d01f	2026-04-02 15:41:16.187989+00	1
507	110	\N	55000.00	2026-04-03	trader_payments	26	Received from Trader #7	b0611081-fdfd-4009-9159-7400924ff655	2026-04-03 08:20:49.32524+00	1
508	101	55000.00	\N	2026-04-03	trader_payments	26	Payment Ref: Some("5913")	b0611081-fdfd-4009-9159-7400924ff655	2026-04-03 08:20:49.326556+00	1
509	105	85200.00	\N	2026-04-03	supplier_payments	33	Payment to Supplier #2	c11dd509-70ce-4eb2-861c-4bac059252c6	2026-04-03 08:22:02.707774+00	1
510	101	\N	85200.00	2026-04-03	supplier_payments	33	Payment Ref: Some("")	c11dd509-70ce-4eb2-861c-4bac059252c6	2026-04-03 08:22:02.708295+00	1
511	104	114400.00	\N	2026-04-02	purchases	71	Purchase of 2244 (item SC101)	cb209458-ac8f-439d-995b-7c04ede9dfe7	2026-04-03 09:16:26.158811+00	1
512	105	\N	114400.00	2026-04-02	purchases	71	Payment for purchase of 2244 (item SC101)	cb209458-ac8f-439d-995b-7c04ede9dfe7	2026-04-03 09:16:26.160172+00	1
513	105	114400.00	\N	2026-04-02	supplier_payments	34	Payment to Supplier #13	ef55bd85-1057-403d-a444-6b5abb5ce358	2026-04-03 09:17:49.859096+00	1
514	101	\N	114400.00	2026-04-02	supplier_payments	34	Payment Ref: Some("14876")	ef55bd85-1057-403d-a444-6b5abb5ce358	2026-04-03 09:17:49.860774+00	1
515	104	\N	114399.12	2026-04-03	batches	17	Chick allocation for batch 17 - Item: SC101	cd28475d-e701-4bfb-90af-4b621728e38c	2026-04-03 09:19:12.56982+00	1
516	107	114399.12	\N	2026-04-03	batches	17	Chick expense for batch 17 - Item: SC101	cd28475d-e701-4bfb-90af-4b621728e38c	2026-04-03 09:19:12.570173+00	1
517	103	\N	41898.78	2026-04-04	allocations	74	approve of (requirement 74)	cf096b3c-33b3-4707-aee9-1f0a768452d2	2026-04-04 05:17:31.193014+00	1
518	107	41898.78	\N	2026-04-04	allocations	74	Allocation of - Req #74	cf096b3c-33b3-4707-aee9-1f0a768452d2	2026-04-04 05:17:31.193807+00	1
519	103	106269.60	\N	2026-04-03	purchases	72	Purchase of 60 (item FD102)	52da0391-e928-4698-9c96-5fc9b6ecc8a5	2026-04-04 05:27:18.318863+00	1
520	105	\N	106269.60	2026-04-03	purchases	72	Payment for purchase of 60 (item FD102)	52da0391-e928-4698-9c96-5fc9b6ecc8a5	2026-04-04 05:27:18.319941+00	1
521	103	3000.00	\N	2026-04-03	purchases	73	Purchase of 60 (item FD104)	343e2b32-35f8-4656-88c2-478d84040a4b	2026-04-04 05:28:07.239121+00	1
522	105	\N	3000.00	2026-04-03	purchases	73	Payment for purchase of 60 (item FD104)	343e2b32-35f8-4656-88c2-478d84040a4b	2026-04-04 05:28:07.239826+00	1
523	103	106269.60	\N	2026-04-04	purchases	74	Purchase of 60 (item FD102)	9eab27b7-8f5c-4fcd-9117-3b6b030391c9	2026-04-04 07:06:25.464897+00	1
524	105	\N	106269.60	2026-04-04	purchases	74	Payment for purchase of 60 (item FD102)	9eab27b7-8f5c-4fcd-9117-3b6b030391c9	2026-04-04 07:06:25.466183+00	1
525	103	3000.00	\N	2026-04-04	purchases	75	Purchase of 60 (item FD102)	33e8acb2-237b-475b-99b0-846244fb329e	2026-04-04 07:08:09.930083+00	1
526	105	\N	3000.00	2026-04-04	purchases	75	Payment for purchase of 60 (item FD102)	33e8acb2-237b-475b-99b0-846244fb329e	2026-04-04 07:08:09.930466+00	1
527	103	21388.80	\N	2026-04-06	stock_returns	5	Stock return for allocation line 87	312ae4e9-08fb-4b14-9c9b-a2e7b9789c4e	2026-04-06 08:29:37.406314+00	1
528	107	\N	21388.80	2026-04-06	stock_returns	5	Return reversal for allocation line 87	312ae4e9-08fb-4b14-9c9b-a2e7b9789c4e	2026-04-06 08:29:37.407839+00	1
529	103	\N	51121.70	2026-04-06	allocations	75	approve of (requirement 75)	678a5766-c57e-4c99-9a82-64ea97846551	2026-04-06 08:30:24.062219+00	1
530	107	51121.70	\N	2026-04-06	allocations	75	Allocation of - Req #75	678a5766-c57e-4c99-9a82-64ea97846551	2026-04-06 08:30:24.063377+00	1
531	102	\N	280.00	2026-04-06	allocations	76	approve of (requirement 76)	370701d5-d03a-41ab-a489-da5396f925de	2026-04-06 08:31:20.802838+00	1
532	107	280.00	\N	2026-04-06	allocations	76	Allocation of - Req #76	370701d5-d03a-41ab-a489-da5396f925de	2026-04-06 08:31:20.803999+00	1
533	102	\N	4430.00	2026-04-06	allocations	77	approve of (requirement 77)	56d388c5-f2f1-4fbe-8f73-a744979cb3bf	2026-04-06 08:31:56.504251+00	1
534	107	4430.00	\N	2026-04-06	allocations	77	Allocation of - Req #77	56d388c5-f2f1-4fbe-8f73-a744979cb3bf	2026-04-06 08:31:56.505122+00	1
535	103	\N	4167.00	2026-04-06	allocations	78	approve of (requirement 78)	c36ef353-b790-4a51-92bb-aac01add0152	2026-04-06 08:34:02.172725+00	1
536	107	4167.00	\N	2026-04-06	allocations	78	Allocation of - Req #78	c36ef353-b790-4a51-92bb-aac01add0152	2026-04-06 08:34:02.173557+00	1
537	103	\N	1733.40	2026-04-06	allocations	79	approve of (requirement 79)	91c6c0aa-5833-400d-9fa9-341f365977f6	2026-04-06 08:34:39.095247+00	1
538	107	1733.40	\N	2026-04-06	allocations	79	Allocation of - Req #79	91c6c0aa-5833-400d-9fa9-341f365977f6	2026-04-06 08:34:39.095891+00	1
539	102	\N	500.00	2026-04-06	allocations	80	approve of (requirement 80)	1c6e81b8-c184-44df-b851-a6196b53df85	2026-04-06 08:35:16.528332+00	1
540	107	500.00	\N	2026-04-06	allocations	80	Allocation of - Req #80	1c6e81b8-c184-44df-b851-a6196b53df85	2026-04-06 08:35:16.529141+00	1
541	102	\N	40.00	2026-04-06	allocations	81	approve of (requirement 81)	3938c4b1-477a-4865-8041-077ea5573f6c	2026-04-06 08:35:27.70887+00	1
542	107	40.00	\N	2026-04-06	allocations	81	Allocation of - Req #81	3938c4b1-477a-4865-8041-077ea5573f6c	2026-04-06 08:35:27.709146+00	1
543	110	166089.00	\N	2026-04-06	batch_sales	47	Sale for batch 6	95b3b186-1621-48ab-903e-cedaafc3692b	2026-04-06 08:38:17.507148+00	1
544	108	\N	166089.00	2026-04-06	batch_sales	47	Revenue from sale for batch 6	95b3b186-1621-48ab-903e-cedaafc3692b	2026-04-06 08:38:17.507522+00	1
545	110	94867.50	\N	2026-04-06	batch_sales	48	Sale for batch 6	2a517a6c-8f25-491f-965f-c3d801151b63	2026-04-06 08:39:06.339763+00	1
546	108	\N	94867.50	2026-04-06	batch_sales	48	Revenue from sale for batch 6	2a517a6c-8f25-491f-965f-c3d801151b63	2026-04-06 08:39:06.340114+00	1
547	110	149311.60	\N	2026-04-06	batch_sales	49	Sale for batch 6	33acd70d-7310-4ac1-8fcf-c4eb5066dc40	2026-04-06 08:39:30.681978+00	1
548	108	\N	149311.60	2026-04-06	batch_sales	49	Revenue from sale for batch 6	33acd70d-7310-4ac1-8fcf-c4eb5066dc40	2026-04-06 08:39:30.682418+00	1
549	110	60354.00	\N	2026-04-06	batch_sales	50	Sale for batch 6	8b1bb172-0ea3-4619-a124-9f6e92595ae6	2026-04-06 08:40:57.767965+00	1
550	108	\N	60354.00	2026-04-06	batch_sales	50	Revenue from sale for batch 6	8b1bb172-0ea3-4619-a124-9f6e92595ae6	2026-04-06 08:40:57.768274+00	1
551	110	106022.80	\N	2026-04-06	batch_sales	51	Sale for batch 6	4f494cd2-6f7a-49b9-ba88-5a4d9b94ee18	2026-04-06 08:41:42.184983+00	1
552	108	\N	106022.80	2026-04-06	batch_sales	51	Revenue from sale for batch 6	4f494cd2-6f7a-49b9-ba88-5a4d9b94ee18	2026-04-06 08:41:42.185346+00	1
553	110	87018.75	\N	2026-04-06	batch_sales	52	Sale for batch 6	e32ddc4f-4f5c-4818-822b-401968a7d881	2026-04-06 08:42:13.863655+00	1
554	108	\N	87018.75	2026-04-06	batch_sales	52	Revenue from sale for batch 6	e32ddc4f-4f5c-4818-822b-401968a7d881	2026-04-06 08:42:13.864246+00	1
555	110	4021.50	\N	2026-04-06	batch_sales	53	Sale for batch 6	df87779d-d301-41c8-b993-54af14a31ad8	2026-04-06 08:42:43.658905+00	1
556	108	\N	4021.50	2026-04-06	batch_sales	53	Revenue from sale for batch 6	df87779d-d301-41c8-b993-54af14a31ad8	2026-04-06 08:42:43.659376+00	1
557	110	1.00	\N	2026-04-06	batch_sales	54	Sale for batch 6	577996b0-6811-4e5c-a4d0-224d4a20b4bb	2026-04-06 08:51:13.082784+00	1
558	108	\N	1.00	2026-04-06	batch_sales	54	Revenue from sale for batch 6	577996b0-6811-4e5c-a4d0-224d4a20b4bb	2026-04-06 08:51:13.083374+00	1
559	103	39429.80	\N	2026-04-07	purchases	76	Purchase of 20 (item FD101)	65c3a9bc-4d55-410e-8d4e-80d6f415577f	2026-04-07 06:16:29.50325+00	1
560	105	\N	39429.80	2026-04-07	purchases	76	Payment for purchase of 20 (item FD101)	65c3a9bc-4d55-410e-8d4e-80d6f415577f	2026-04-07 06:16:29.504422+00	1
561	103	70846.40	\N	2026-04-06	purchases	77	Purchase of 40 (item FD102)	c10648ac-daed-4162-826c-6286eb9b8758	2026-04-07 06:17:47.710294+00	1
562	105	\N	70846.40	2026-04-06	purchases	77	Payment for purchase of 40 (item FD102)	c10648ac-daed-4162-826c-6286eb9b8758	2026-04-07 06:17:47.71069+00	1
563	103	2820.00	\N	2026-04-06	purchases	78	Purchase of 60 (item FD104)	73202c4e-0a76-486d-b1f5-17c57fd26338	2026-04-07 06:19:02.414883+00	1
564	105	\N	2820.00	2026-04-06	purchases	78	Payment for purchase of 60 (item FD104)	73202c4e-0a76-486d-b1f5-17c57fd26338	2026-04-07 06:19:02.415269+00	1
565	103	35648.00	\N	2026-04-08	stock_returns	6	Stock return for allocation line 86	734cfa5c-35da-4a90-81f2-bd234afd5080	2026-04-08 14:28:40.120334+00	1
566	107	\N	35648.00	2026-04-08	stock_returns	6	Return reversal for allocation line 86	734cfa5c-35da-4a90-81f2-bd234afd5080	2026-04-08 14:28:40.121048+00	1
567	103	\N	47712.00	2026-04-08	allocations	82	approve of (requirement 82)	7472e8d7-b6e7-4a64-aeff-977206dce165	2026-04-08 14:28:57.940063+00	1
568	107	47712.00	\N	2026-04-08	allocations	82	Allocation of - Req #82	7472e8d7-b6e7-4a64-aeff-977206dce165	2026-04-08 14:28:57.940528+00	1
569	103	\N	9844.85	2026-04-08	allocations	83	approve of (requirement 83)	615dc224-2bb5-4ba9-9910-8f348801018d	2026-04-08 14:32:01.728643+00	1
570	107	9844.85	\N	2026-04-08	allocations	83	Allocation of - Req #83	615dc224-2bb5-4ba9-9910-8f348801018d	2026-04-08 14:32:01.73007+00	1
571	102	2950.00	\N	2026-04-08	purchases	79	Purchase of 10 (item MD101)	03ecc744-546c-41e1-8956-b5149fa2c43c	2026-04-08 14:33:11.979691+00	1
572	101	\N	2950.00	2026-04-08	purchases	79	Payment for purchase of 10 (item MD101)	03ecc744-546c-41e1-8956-b5149fa2c43c	2026-04-08 14:33:11.98095+00	1
573	102	\N	2950.00	2026-04-08	allocations	84	approve of (requirement 84)	026d85a8-ecb8-429a-9fa4-422f25f9bab9	2026-04-08 14:33:35.515544+00	1
574	107	2950.00	\N	2026-04-08	allocations	84	Allocation of - Req #84	026d85a8-ecb8-429a-9fa4-422f25f9bab9	2026-04-08 14:33:35.516187+00	1
575	103	106269.60	\N	2026-04-08	purchases	80	Purchase of 60 (item FD102)	6a037ef1-bef8-4654-b4f1-1e45544d0598	2026-04-09 04:29:41.418685+00	1
576	105	\N	106269.60	2026-04-08	purchases	80	Payment for purchase of 60 (item FD102)	6a037ef1-bef8-4654-b4f1-1e45544d0598	2026-04-09 04:29:41.420045+00	1
577	103	2502.00	\N	2026-04-09	purchases	81	Purchase of 60 (item FD104)	9af1c631-7ab0-429f-9a19-02700bacdb41	2026-04-09 04:30:50.232254+00	1
578	105	\N	2502.00	2026-04-09	purchases	81	Payment for purchase of 60 (item FD104)	9af1c631-7ab0-429f-9a19-02700bacdb41	2026-04-09 04:30:50.233485+00	1
579	103	120299.40	\N	2026-04-14	purchases	82	Purchase of 60 (item FD101)	9e554f7a-acc9-471a-a8ce-11993dd60857	2026-04-14 06:38:38.528681+00	1
580	105	\N	120299.40	2026-04-14	purchases	82	Payment for purchase of 60 (item FD101)	9e554f7a-acc9-471a-a8ce-11993dd60857	2026-04-14 06:38:38.530478+00	1
581	103	2499.60	\N	2026-04-14	purchases	83	Purchase of 60 (item FD104)	1f0eab16-20af-44a5-9c0e-c1bbd2cc8564	2026-04-14 06:42:34.70635+00	1
582	105	\N	2499.60	2026-04-14	purchases	83	Payment for purchase of 60 (item FD104)	1f0eab16-20af-44a5-9c0e-c1bbd2cc8564	2026-04-14 06:42:34.706739+00	1
585	103	3000.00	\N	2026-04-14	purchases	85	Purchase of 60 (item FD104)	d5e8fc88-bc59-41dd-9a97-8b0a4487a883	2026-04-14 06:44:14.861257+00	1
586	105	\N	3000.00	2026-04-14	purchases	85	Payment for purchase of 60 (item FD104)	d5e8fc88-bc59-41dd-9a97-8b0a4487a883	2026-04-14 06:44:14.861575+00	1
587	103	108279.60	\N	2026-04-14	purchases	86	Purchase of 60 (item FD102)	5e711083-c104-430d-b0e3-42ffc089c0cf	2026-04-14 06:56:53.878649+00	1
588	105	\N	108279.60	2026-04-14	purchases	86	Payment for purchase of 60 (item FD102)	5e711083-c104-430d-b0e3-42ffc089c0cf	2026-04-14 06:56:53.8804+00	1
589	103	34085.00	\N	2026-04-15	purchases	87	Purchase of 17 (item FD101)	a642064b-11f7-4184-9aa7-d53156d8a83f	2026-04-15 08:10:44.294058+00	1
590	105	\N	34085.00	2026-04-15	purchases	87	Payment for purchase of 17 (item FD101)	a642064b-11f7-4184-9aa7-d53156d8a83f	2026-04-15 08:10:44.295485+00	1
591	103	77615.00	\N	2026-04-15	purchases	88	Purchase of 43 (item FD102)	85be11f3-bee0-492c-9814-427161206dfa	2026-04-15 08:13:51.097054+00	1
592	105	\N	77615.00	2026-04-15	purchases	88	Payment for purchase of 43 (item FD102)	85be11f3-bee0-492c-9814-427161206dfa	2026-04-15 08:13:51.098131+00	1
593	103	2500.00	\N	2026-04-15	purchases	89	Purchase of 60 (item FD104)	eded7aeb-d940-4ad0-b671-74579b744917	2026-04-15 08:14:46.852665+00	1
594	105	\N	2500.00	2026-04-15	purchases	89	Payment for purchase of 60 (item FD104)	eded7aeb-d940-4ad0-b671-74579b744917	2026-04-15 08:14:46.852968+00	1
595	103	2500.00	\N	2026-04-15	purchases	90	Purchase of 60 (item FD104)	81c251e3-30f2-455a-9a23-03445993ee2d	2026-04-15 08:16:32.329155+00	1
596	105	\N	2500.00	2026-04-15	purchases	90	Payment for purchase of 60 (item FD104)	81c251e3-30f2-455a-9a23-03445993ee2d	2026-04-15 08:16:32.329525+00	1
597	103	20050.00	\N	2026-04-15	purchases	91	Purchase of 10 (item FD101)	58851c70-8389-443f-86ef-be1d3df19826	2026-04-15 08:18:45.675471+00	1
598	105	\N	20050.00	2026-04-15	purchases	91	Payment for purchase of 10 (item FD101)	58851c70-8389-443f-86ef-be1d3df19826	2026-04-15 08:18:45.675691+00	1
599	103	90233.00	\N	2026-04-15	purchases	92	Purchase of 50 (item FD102)	00b3bc31-4b83-4073-ad59-450b4c464a47	2026-04-15 08:19:22.091101+00	1
600	105	\N	90233.00	2026-04-15	purchases	92	Payment for purchase of 50 (item FD102)	00b3bc31-4b83-4073-ad59-450b4c464a47	2026-04-15 08:19:22.091291+00	1
601	103	108280.00	\N	2026-04-16	purchases	93	Purchase of 60 (item FD102)	76c95e31-4f2b-4f66-8010-238012520a84	2026-04-16 05:43:41.634681+00	1
602	105	\N	108280.00	2026-04-16	purchases	93	Payment for purchase of 60 (item FD102)	76c95e31-4f2b-4f66-8010-238012520a84	2026-04-16 05:43:41.636819+00	1
603	103	2700.00	\N	2026-04-16	purchases	94	Purchase of 60 (item FD104)	9a941ece-407c-4f28-b4c4-63ce5c4d4d93	2026-04-16 05:44:45.269364+00	1
604	105	\N	2700.00	2026-04-16	purchases	94	Payment for purchase of 60 (item FD104)	9a941ece-407c-4f28-b4c4-63ce5c4d4d93	2026-04-16 05:44:45.269784+00	1
605	110	150436.00	\N	2026-04-20	batch_sales	55	Sale for batch 8	f7c403f7-6d6f-48db-9e39-4425b4bf2dc0	2026-04-20 10:13:34.024075+00	1
606	108	\N	150436.00	2026-04-20	batch_sales	55	Revenue from sale for batch 8	f7c403f7-6d6f-48db-9e39-4425b4bf2dc0	2026-04-20 10:13:34.02487+00	1
607	110	104743.60	\N	2026-04-20	batch_sales	56	Sale for batch 8	48bbe693-4fca-4ab3-93ba-f7633e653250	2026-04-20 10:14:13.313362+00	1
608	108	\N	104743.60	2026-04-20	batch_sales	56	Revenue from sale for batch 8	48bbe693-4fca-4ab3-93ba-f7633e653250	2026-04-20 10:14:13.3139+00	1
609	110	69226.30	\N	2026-04-20	batch_sales	57	Sale for batch 8	3c926ea6-a38f-49fa-88c1-da11e1db8e03	2026-04-20 10:15:19.101248+00	1
610	108	\N	69226.30	2026-04-20	batch_sales	57	Revenue from sale for batch 8	3c926ea6-a38f-49fa-88c1-da11e1db8e03	2026-04-20 10:15:19.101628+00	1
611	110	31038.80	\N	2026-04-20	batch_sales	58	Sale for batch 8	996a4234-c4b0-4e49-ba03-784fc8588430	2026-04-20 10:18:41.343037+00	1
612	108	\N	31038.80	2026-04-20	batch_sales	58	Revenue from sale for batch 8	996a4234-c4b0-4e49-ba03-784fc8588430	2026-04-20 10:18:41.34465+00	1
613	110	57381.30	\N	2026-04-20	batch_sales	59	Sale for batch 8	683cc88f-b875-4059-b287-743bba174076	2026-04-20 10:19:15.521527+00	1
614	108	\N	57381.30	2026-04-20	batch_sales	59	Revenue from sale for batch 8	683cc88f-b875-4059-b287-743bba174076	2026-04-20 10:19:15.522013+00	1
615	110	77012.50	\N	2026-04-20	batch_sales	60	Sale for batch 8	5f92722e-b0c0-487b-a5f9-baf46e30606f	2026-04-20 10:20:27.255083+00	1
616	108	\N	77012.50	2026-04-20	batch_sales	60	Revenue from sale for batch 8	5f92722e-b0c0-487b-a5f9-baf46e30606f	2026-04-20 10:20:27.256048+00	1
617	110	54234.65	\N	2026-04-20	batch_sales	61	Sale for batch 8	53a2b971-316a-4b71-b1b3-d8c106e7a9eb	2026-04-20 10:21:07.71099+00	1
618	108	\N	54234.65	2026-04-20	batch_sales	61	Revenue from sale for batch 8	53a2b971-316a-4b71-b1b3-d8c106e7a9eb	2026-04-20 10:21:07.711649+00	1
619	110	2334.00	\N	2026-04-20	batch_sales	62	Sale for batch 8	2fd180a6-be19-4895-872b-dc389bd11662	2026-04-20 10:22:37.485777+00	1
620	108	\N	2334.00	2026-04-20	batch_sales	62	Revenue from sale for batch 8	2fd180a6-be19-4895-872b-dc389bd11662	2026-04-20 10:22:37.486039+00	1
621	103	\N	53263.73	2026-04-20	allocations	85	approve of (requirement 85)	1e93138b-351b-49d8-968d-76fc60c22d40	2026-04-20 10:26:16.275166+00	1
622	107	53263.73	\N	2026-04-20	allocations	85	Allocation of - Req #85	1e93138b-351b-49d8-968d-76fc60c22d40	2026-04-20 10:26:16.276046+00	1
623	102	3000.00	\N	2026-04-20	purchases	95	Purchase of 1 (item MD101)	dfbd2943-4820-4051-bbb9-08bf955a972a	2026-04-20 10:28:04.849831+00	1
624	105	\N	3000.00	2026-04-20	purchases	95	Payment for purchase of 1 (item MD101)	dfbd2943-4820-4051-bbb9-08bf955a972a	2026-04-20 10:28:04.850255+00	1
625	102	\N	3000.00	2026-04-20	allocations	86	approve of (requirement 87)	31c55d64-4242-4bcd-b412-39fd1bc7f365	2026-04-20 10:28:17.359262+00	1
626	107	3000.00	\N	2026-04-20	allocations	86	Allocation of - Req #87	31c55d64-4242-4bcd-b412-39fd1bc7f365	2026-04-20 10:28:17.36043+00	1
627	103	\N	8230.00	2026-04-20	allocations	87	approve of (requirement 88)	51ef3193-34ff-422e-8dfb-3a85d594e256	2026-04-20 10:32:52.394193+00	1
628	107	8230.00	\N	2026-04-20	allocations	87	Allocation of - Req #88	51ef3193-34ff-422e-8dfb-3a85d594e256	2026-04-20 10:32:52.394544+00	1
629	110	163930.00	\N	2026-04-20	batch_sales	63	Sale for batch 9	5e02d5af-4611-4698-a245-bed8dc63757e	2026-04-20 10:34:59.114468+00	1
630	108	\N	163930.00	2026-04-20	batch_sales	63	Revenue from sale for batch 9	5e02d5af-4611-4698-a245-bed8dc63757e	2026-04-20 10:34:59.114769+00	1
631	110	67099.50	\N	2026-04-20	batch_sales	64	Sale for batch 9	7ce1ce43-83b8-413d-90c6-72a3f50a1e59	2026-04-20 10:35:29.311314+00	1
632	108	\N	67099.50	2026-04-20	batch_sales	64	Revenue from sale for batch 9	7ce1ce43-83b8-413d-90c6-72a3f50a1e59	2026-04-20 10:35:29.312647+00	1
633	110	56023.50	\N	2026-04-20	batch_sales	65	Sale for batch 9	8b52967a-d2ea-4969-a516-d467d970b38a	2026-04-20 10:36:02.294645+00	1
634	108	\N	56023.50	2026-04-20	batch_sales	65	Revenue from sale for batch 9	8b52967a-d2ea-4969-a516-d467d970b38a	2026-04-20 10:36:02.295011+00	1
635	110	153708.85	\N	2026-04-20	batch_sales	66	Sale for batch 9	05b8f409-3dd9-4b23-9533-1dfc4149e135	2026-04-20 10:36:40.76949+00	1
636	108	\N	153708.85	2026-04-20	batch_sales	66	Revenue from sale for batch 9	05b8f409-3dd9-4b23-9533-1dfc4149e135	2026-04-20 10:36:40.769833+00	1
637	110	1460.00	\N	2026-04-20	batch_sales	67	Sale for batch 9	48827cb6-c7a8-4444-9374-3a45eeae63dd	2026-04-20 10:38:15.771137+00	1
638	108	\N	1460.00	2026-04-20	batch_sales	67	Revenue from sale for batch 9	48827cb6-c7a8-4444-9374-3a45eeae63dd	2026-04-20 10:38:15.771535+00	1
639	110	1.00	\N	2026-04-20	batch_sales	68	Sale for batch 9	14a5a87c-7124-4415-b9ef-c258b5b1c996	2026-04-20 10:39:29.426881+00	1
640	108	\N	1.00	2026-04-20	batch_sales	68	Revenue from sale for batch 9	14a5a87c-7124-4415-b9ef-c258b5b1c996	2026-04-20 10:39:29.427124+00	1
641	104	155400.00	\N	2026-04-08	purchases	96	Purchase of 3768 (item SC101)	847181a9-c494-4d4d-b705-753db2c49e4c	2026-04-20 11:18:42.671589+00	1
642	105	\N	155400.00	2026-04-08	purchases	96	Payment for purchase of 3768 (item SC101)	847181a9-c494-4d4d-b705-753db2c49e4c	2026-04-20 11:18:42.672658+00	1
643	104	\N	155392.32	2026-04-20	batches	18	Chick allocation for batch 18 - Item: SC101	ffdb2836-73fe-4e26-96d7-192b9d24d7c7	2026-04-20 11:19:04.763792+00	1
644	107	155392.32	\N	2026-04-20	batches	18	Chick expense for batch 18 - Item: SC101	ffdb2836-73fe-4e26-96d7-192b9d24d7c7	2026-04-20 11:19:04.764187+00	1
645	104	187000.00	\N	2026-04-13	purchases	97	Purchase of 3468 (item SC101)	97c14c91-a5a8-4e5d-831b-9a1f62fecb3d	2026-04-20 11:27:48.804391+00	1
646	105	\N	187000.00	2026-04-13	purchases	97	Payment for purchase of 3468 (item SC101)	97c14c91-a5a8-4e5d-831b-9a1f62fecb3d	2026-04-20 11:27:48.805507+00	1
647	104	\N	186994.56	2026-04-20	batches	19	Chick allocation for batch 19 - Item: SC101	8639c01e-8d35-49f5-939f-aaa41cf2efa4	2026-04-20 11:29:16.429418+00	1
648	107	186994.56	\N	2026-04-20	batches	19	Chick expense for batch 19 - Item: SC101	8639c01e-8d35-49f5-939f-aaa41cf2efa4	2026-04-20 11:29:16.429786+00	1
649	104	118000.00	\N	2026-04-09	purchases	98	Purchase of 2747 (item SC101)	547feb98-58d5-417b-99d4-254e7d77054b	2026-04-20 11:34:03.879822+00	1
650	105	\N	118000.00	2026-04-09	purchases	98	Payment for purchase of 2747 (item SC101)	547feb98-58d5-417b-99d4-254e7d77054b	2026-04-20 11:34:03.880163+00	1
651	104	\N	118011.12	2026-04-20	batches	20	Chick allocation for batch 20 - Item: SC101	53171ef2-3eb3-41de-9a28-1c9038702599	2026-04-20 11:35:38.762956+00	1
652	107	118011.12	\N	2026-04-20	batches	20	Chick expense for batch 20 - Item: SC101	53171ef2-3eb3-41de-9a28-1c9038702599	2026-04-20 11:35:38.763544+00	1
653	103	108279.60	\N	2026-04-23	purchases	99	Purchase of 60 (item FD102)	3d48117a-510f-4914-83fe-8229e53b3bb1	2026-04-23 06:47:37.526945+00	1
654	105	\N	108279.60	2026-04-23	purchases	99	Payment for purchase of 60 (item FD102)	3d48117a-510f-4914-83fe-8229e53b3bb1	2026-04-23 06:47:37.529166+00	1
655	103	40099.80	\N	2026-04-23	purchases	100	Purchase of 20 (item FD101)	4a2328f2-9490-4e50-987a-a2d154feeee7	2026-04-23 06:48:36.498911+00	1
656	105	\N	40099.80	2026-04-23	purchases	100	Payment for purchase of 20 (item FD101)	4a2328f2-9490-4e50-987a-a2d154feeee7	2026-04-23 06:48:36.499224+00	1
657	103	72186.40	\N	2026-04-23	purchases	101	Purchase of 40 (item FD102)	e99ad9cc-447d-45c3-afcd-0f2f25e8a876	2026-04-23 06:49:04.254529+00	1
658	105	\N	72186.40	2026-04-23	purchases	101	Payment for purchase of 40 (item FD102)	e99ad9cc-447d-45c3-afcd-0f2f25e8a876	2026-04-23 06:49:04.254935+00	1
659	103	30074.85	\N	2026-04-23	purchases	102	Purchase of 15 (item FD101)	a2052b89-53a2-4f7b-a98b-d2406a7e59cf	2026-04-23 06:49:52.765093+00	1
660	105	\N	30074.85	2026-04-23	purchases	102	Payment for purchase of 15 (item FD101)	a2052b89-53a2-4f7b-a98b-d2406a7e59cf	2026-04-23 06:49:52.765343+00	1
661	103	81209.70	\N	2026-04-23	purchases	103	Purchase of 45 (item FD102)	e8f1f571-6b43-4382-a424-4134b27e71fa	2026-04-23 06:50:25.129273+00	1
662	105	\N	81209.70	2026-04-23	purchases	103	Payment for purchase of 45 (item FD102)	e8f1f571-6b43-4382-a424-4134b27e71fa	2026-04-23 06:50:25.129564+00	1
663	103	\N	212404.88	2026-04-24	allocations	91	approve of (requirement 92)	356a068f-f585-41e2-aee8-f7158dcc1e6a	2026-04-24 06:53:37.347748+00	1
664	107	212404.88	\N	2026-04-24	allocations	91	Allocation of - Req #92	356a068f-f585-41e2-aee8-f7158dcc1e6a	2026-04-24 06:53:37.349171+00	1
665	102	3500.00	\N	2026-04-24	purchases	104	Purchase of 1 (item MD101)	4391153d-de6e-4ff3-96cd-ce9c050ab4f3	2026-04-24 06:54:13.533168+00	1
666	105	\N	3500.00	2026-04-24	purchases	104	Payment for purchase of 1 (item MD101)	4391153d-de6e-4ff3-96cd-ce9c050ab4f3	2026-04-24 06:54:13.533494+00	1
667	102	\N	3500.00	2026-04-24	allocations	92	approve of (requirement 93)	9708bda3-fbaf-4292-bda2-14ed9854b594	2026-04-24 06:54:35.815942+00	1
668	107	3500.00	\N	2026-04-24	allocations	92	Allocation of - Req #93	9708bda3-fbaf-4292-bda2-14ed9854b594	2026-04-24 06:54:35.816897+00	1
669	103	\N	9500.00	2026-04-24	allocations	93	approve of (requirement 94)	62d514ad-5e92-481d-9f7f-7c5ebaf5e847	2026-04-24 06:55:00.171296+00	1
670	107	9500.00	\N	2026-04-24	allocations	93	Allocation of - Req #94	62d514ad-5e92-481d-9f7f-7c5ebaf5e847	2026-04-24 06:55:00.172749+00	1
671	110	\N	47317.00	2026-04-02	trader_payments	27	Received from Trader #2	9eec0ba8-4878-4d98-b330-8ca05443bea4	2026-04-24 07:03:17.433171+00	1
672	101	47317.00	\N	2026-04-02	trader_payments	27	Payment Ref: Some("")	9eec0ba8-4878-4d98-b330-8ca05443bea4	2026-04-24 07:03:17.433661+00	1
673	110	\N	100000.00	2026-04-03	trader_payments	28	Received from Trader #2	0459a863-c3d6-4db3-80b8-c07a48d0b4a7	2026-04-24 07:03:39.812731+00	1
674	101	100000.00	\N	2026-04-03	trader_payments	28	Payment Ref: Some("")	0459a863-c3d6-4db3-80b8-c07a48d0b4a7	2026-04-24 07:03:39.81304+00	1
683	110	48973.60	\N	2026-04-24	batch_sales	73	Sale for batch 10	4fcf91ef-b40e-4e8b-bb14-303cf615226a	2026-04-24 07:12:00.061863+00	1
684	108	\N	48973.60	2026-04-24	batch_sales	73	Revenue from sale for batch 10	4fcf91ef-b40e-4e8b-bb14-303cf615226a	2026-04-24 07:12:00.06252+00	1
675	110	94930.50	\N	2026-04-24	batch_sales	69	Sale for batch 10	b1aa1f3b-a5a6-4c83-ad91-aaf97101ef36	2026-04-24 07:06:46.521502+00	1
676	108	\N	94930.50	2026-04-24	batch_sales	69	Revenue from sale for batch 10	b1aa1f3b-a5a6-4c83-ad91-aaf97101ef36	2026-04-24 07:06:46.522181+00	1
677	110	62873.20	\N	2026-04-24	batch_sales	70	Sale for batch 10	9e880875-fc68-41cf-bf11-886e2f4a3877	2026-04-24 07:07:11.833564+00	1
678	108	\N	62873.20	2026-04-24	batch_sales	70	Revenue from sale for batch 10	9e880875-fc68-41cf-bf11-886e2f4a3877	2026-04-24 07:07:11.83393+00	1
679	110	130226.25	\N	2026-04-24	batch_sales	71	Sale for batch 10	3361de9a-0429-450f-93a8-10ffed0f7aad	2026-04-24 07:07:42.649575+00	1
680	108	\N	130226.25	2026-04-24	batch_sales	71	Revenue from sale for batch 10	3361de9a-0429-450f-93a8-10ffed0f7aad	2026-04-24 07:07:42.650242+00	1
681	110	101734.50	\N	2026-04-24	batch_sales	72	Sale for batch 10	8b2adb4c-49e0-49fa-98ed-440ee32033f1	2026-04-24 07:10:57.597139+00	1
682	108	\N	101734.50	2026-04-24	batch_sales	72	Revenue from sale for batch 10	8b2adb4c-49e0-49fa-98ed-440ee32033f1	2026-04-24 07:10:57.599347+00	1
685	110	53494.65	\N	2026-04-24	batch_sales	74	Sale for batch 10	4f849f08-87a2-48d5-8914-920bd29e7be9	2026-04-24 07:12:32.923893+00	1
686	108	\N	53494.65	2026-04-24	batch_sales	74	Revenue from sale for batch 10	4f849f08-87a2-48d5-8914-920bd29e7be9	2026-04-24 07:12:32.924168+00	1
689	110	10335.00	\N	2026-04-24	batch_sales	76	Sale for batch 10	e1ff8f66-7353-4d67-a4b0-ada67ac115d3	2026-04-24 07:15:38.518143+00	1
690	108	\N	10335.00	2026-04-24	batch_sales	76	Revenue from sale for batch 10	e1ff8f66-7353-4d67-a4b0-ada67ac115d3	2026-04-24 07:15:38.518436+00	1
687	110	27653.60	\N	2026-04-24	batch_sales	75	Sale for batch 10	fa420062-f649-42dd-8414-8e5f7665425e	2026-04-24 07:13:03.950517+00	1
688	108	\N	27653.60	2026-04-24	batch_sales	75	Revenue from sale for batch 10	fa420062-f649-42dd-8414-8e5f7665425e	2026-04-24 07:13:03.951474+00	1
691	103	\N	5442.32	2026-04-25	allocations	94	approve of (requirement 95)	d26cb2fb-8b54-4215-a881-d27a833e4a8f	2026-04-25 02:14:05.006318+00	1
692	107	5442.32	\N	2026-04-25	allocations	94	Allocation of - Req #95	d26cb2fb-8b54-4215-a881-d27a833e4a8f	2026-04-25 02:14:05.007646+00	1
693	103	\N	15269.28	2026-04-25	allocations	95	approve of (requirement 96)	bff3419d-1770-4e14-9762-dd04ac535b08	2026-04-25 02:14:08.613214+00	1
694	107	15269.28	\N	2026-04-25	allocations	95	Allocation of - Req #96	bff3419d-1770-4e14-9762-dd04ac535b08	2026-04-25 02:14:08.614624+00	1
695	103	\N	3630.00	2026-04-25	allocations	97	approve of (requirement 98)	7e419128-74c6-4493-8823-03a2e1dbaadd	2026-04-25 02:14:17.050353+00	1
696	107	3630.00	\N	2026-04-25	allocations	97	Allocation of - Req #98	7e419128-74c6-4493-8823-03a2e1dbaadd	2026-04-25 02:14:17.051975+00	1
697	102	2150.00	\N	2026-04-25	purchases	105	Purchase of 1 (item MD101)	8b83e6a9-0c6b-4bb8-b368-028e234cb12e	2026-04-25 02:14:47.491724+00	1
698	105	\N	2150.00	2026-04-25	purchases	105	Payment for purchase of 1 (item MD101)	8b83e6a9-0c6b-4bb8-b368-028e234cb12e	2026-04-25 02:14:47.492313+00	1
699	102	\N	2150.00	2026-04-25	allocations	98	approve of (requirement 97)	f6b06927-9d82-49cc-9eb4-13a6bfff86a7	2026-04-25 02:14:55.351134+00	1
700	107	2150.00	\N	2026-04-25	allocations	98	Allocation of - Req #97	f6b06927-9d82-49cc-9eb4-13a6bfff86a7	2026-04-25 02:14:55.352004+00	1
701	110	\N	30000.00	2026-04-05	trader_payments	29	Received from Trader #15	0ddc16b3-b59d-4fcf-8761-264179ad2b93	2026-04-25 02:20:57.347668+00	1
702	101	30000.00	\N	2026-04-05	trader_payments	29	Payment Ref: Some("")	0ddc16b3-b59d-4fcf-8761-264179ad2b93	2026-04-25 02:20:57.348152+00	1
703	110	\N	1038.00	2026-04-05	trader_payments	30	Received from Trader #15	dc9204a9-9834-4089-ad1f-3c242060c12c	2026-04-25 02:21:47.050171+00	1
704	101	1038.00	\N	2026-04-05	trader_payments	30	Payment Ref: Some("")	dc9204a9-9834-4089-ad1f-3c242060c12c	2026-04-25 02:21:47.050605+00	1
705	110	\N	48973.60	2026-04-19	trader_payments	31	Received from Trader #15	cebf57fd-b86b-45c6-9a8d-2d61168cdca0	2026-04-25 02:22:11.715855+00	1
706	101	48973.60	\N	2026-04-19	trader_payments	31	Payment Ref: Some("")	cebf57fd-b86b-45c6-9a8d-2d61168cdca0	2026-04-25 02:22:11.716164+00	1
707	110	169047.75	\N	2026-04-25	batch_sales	77	Sale for batch 13	2336c064-9b23-49c6-956e-c5b627d4b2e0	2026-04-25 02:23:17.485752+00	1
708	108	\N	169047.75	2026-04-25	batch_sales	77	Revenue from sale for batch 13	2336c064-9b23-49c6-956e-c5b627d4b2e0	2026-04-25 02:23:17.486168+00	1
709	110	1696.50	\N	2026-04-25	batch_sales	78	Sale for batch 13	3893ec39-6e6b-44f4-8017-8790aa4a4267	2026-04-25 02:24:24.76085+00	1
710	108	\N	1696.50	2026-04-25	batch_sales	78	Revenue from sale for batch 13	3893ec39-6e6b-44f4-8017-8790aa4a4267	2026-04-25 02:24:24.761163+00	1
711	104	63198.00	\N	2026-04-20	purchases	106	Purchase of 1530 (item SC101)	59b043c4-a42e-46b1-b327-14025a38aef5	2026-04-25 02:30:12.832161+00	1
712	105	\N	63198.00	2026-04-20	purchases	106	Payment for purchase of 1530 (item SC101)	59b043c4-a42e-46b1-b327-14025a38aef5	2026-04-25 02:30:12.832416+00	1
713	104	\N	63204.30	2026-04-25	batches	21	Chick allocation for batch 21 - Item: SC101	79847ca3-af5b-4bbe-a5ed-a250689bacef	2026-04-25 02:30:42.081865+00	1
714	107	63204.30	\N	2026-04-25	batches	21	Chick expense for batch 21 - Item: SC101	79847ca3-af5b-4bbe-a5ed-a250689bacef	2026-04-25 02:30:42.082845+00	1
715	103	110490.60	\N	2026-04-25	purchases	107	Purchase of 60 (item FD102)	36bdc156-d570-4d4d-96fc-8409591f9985	2026-04-25 06:11:22.938018+00	1
716	105	\N	110490.60	2026-04-25	purchases	107	Payment for purchase of 60 (item FD102)	36bdc156-d570-4d4d-96fc-8409591f9985	2026-04-25 06:11:22.940899+00	1
717	103	59024.00	\N	2026-04-25	purchases	108	Purchase of 28 (item FD101)	4ede1a71-1862-455d-a2b2-367b7b6f797b	2026-04-25 06:12:17.893317+00	1
718	105	\N	59024.00	2026-04-25	purchases	108	Payment for purchase of 28 (item FD101)	4ede1a71-1862-455d-a2b2-367b7b6f797b	2026-04-25 06:12:17.894142+00	1
719	103	61056.00	\N	2026-04-25	purchases	109	Purchase of 32 (item FD102)	7cd51914-3b87-4ebc-a6a6-266a1abc2257	2026-04-25 06:12:58.37897+00	1
720	105	\N	61056.00	2026-04-25	purchases	109	Payment for purchase of 32 (item FD102)	7cd51914-3b87-4ebc-a6a6-266a1abc2257	2026-04-25 06:12:58.379347+00	1
721	103	11040.00	\N	2026-04-25	purchases	110	Purchase of 240 (item FD104)	a1de7f8d-c298-4cc8-9bf1-151864af4f4d	2026-04-25 07:31:24.045984+00	1
722	105	\N	11040.00	2026-04-25	purchases	110	Payment for purchase of 240 (item FD104)	a1de7f8d-c298-4cc8-9bf1-151864af4f4d	2026-04-25 07:31:24.047057+00	1
723	103	18000.00	\N	2026-04-29	purchases	111	Purchase of 360 (item FD104)	16d50906-2eb4-49c6-86fe-52d1ef5867b1	2026-04-29 02:57:48.685373+00	1
724	105	\N	18000.00	2026-04-29	purchases	111	Payment for purchase of 360 (item FD104)	16d50906-2eb4-49c6-86fe-52d1ef5867b1	2026-04-29 02:57:48.686692+00	1
729	103	114480.00	\N	2026-04-29	purchases	114	Purchase of 60 (item FD102)	fb8f3dce-996a-4962-ac7a-07cdad9446d7	2026-04-29 02:59:55.611133+00	1
730	105	\N	114480.00	2026-04-29	purchases	114	Payment for purchase of 60 (item FD102)	fb8f3dce-996a-4962-ac7a-07cdad9446d7	2026-04-29 02:59:55.611906+00	1
731	103	42160.00	\N	2026-04-29	purchases	115	Purchase of 2108 (item FD101)	486f6219-b09f-4de4-97bd-c21c7dd790df	2026-04-29 03:01:17.545811+00	1
732	105	\N	42160.00	2026-04-29	purchases	115	Payment for purchase of 2108 (item FD101)	486f6219-b09f-4de4-97bd-c21c7dd790df	2026-04-29 03:01:17.546175+00	1
733	103	76320.00	\N	2026-04-29	purchases	116	Purchase of 40 (item FD102)	1feada45-f451-4f89-aa66-66236062a96c	2026-04-29 03:01:42.745931+00	1
734	105	\N	76320.00	2026-04-29	purchases	116	Payment for purchase of 40 (item FD102)	1feada45-f451-4f89-aa66-66236062a96c	2026-04-29 03:01:42.74628+00	1
735	103	42160.00	\N	2026-04-29	purchases	117	Purchase of 20 (item FD101)	013a92f7-ae49-4e79-adb7-d9f441baef9b	2026-04-29 03:02:34.114199+00	1
736	105	\N	42160.00	2026-04-29	purchases	117	Payment for purchase of 20 (item FD101)	013a92f7-ae49-4e79-adb7-d9f441baef9b	2026-04-29 03:02:34.114864+00	1
737	103	76320.00	\N	2026-04-29	purchases	118	Purchase of 40 (item FD102)	da3e20d9-540f-4fdd-8536-93cd3ca587e7	2026-04-29 03:03:10.97059+00	1
738	105	\N	76320.00	2026-04-29	purchases	118	Payment for purchase of 40 (item FD102)	da3e20d9-540f-4fdd-8536-93cd3ca587e7	2026-04-29 03:03:10.970861+00	1
739	103	114480.00	\N	2026-04-29	purchases	119	Purchase of 60 (item FD102)	b2f03c88-0b0b-4f08-8d31-7f0df21f8715	2026-04-29 03:04:13.052496+00	1
740	105	\N	114480.00	2026-04-29	purchases	119	Payment for purchase of 60 (item FD102)	b2f03c88-0b0b-4f08-8d31-7f0df21f8715	2026-04-29 03:04:13.052828+00	1
741	103	\N	61990.60	2026-05-13	allocations	100	approve of (requirement 100)	4297e4e1-fae2-4e2c-8d0e-14a23c0aa7f8	2026-05-13 05:01:46.854457+00	1
742	107	61990.60	\N	2026-05-13	allocations	100	Allocation of - Req #100	4297e4e1-fae2-4e2c-8d0e-14a23c0aa7f8	2026-05-13 05:01:46.855652+00	1
743	102	1250.00	\N	2026-04-27	purchases	120	Purchase of 10 (item MD101)	1aa0dede-38be-4d40-9b6d-11282208d0bd	2026-05-13 05:02:45.813441+00	1
744	105	\N	1250.00	2026-04-27	purchases	120	Payment for purchase of 10 (item MD101)	1aa0dede-38be-4d40-9b6d-11282208d0bd	2026-05-13 05:02:45.81451+00	1
745	102	\N	1250.00	2026-05-13	allocations	101	approve of (requirement 101)	e6361bee-9ac1-4b1d-85ec-6ce3f3fe25af	2026-05-13 05:03:05.321441+00	1
746	107	1250.00	\N	2026-05-13	allocations	101	Allocation of - Req #101	e6361bee-9ac1-4b1d-85ec-6ce3f3fe25af	2026-05-13 05:03:05.322669+00	1
747	103	\N	3650.30	2026-05-13	allocations	102	approve of (requirement 102)	e547c81f-a9c6-4c12-af8b-a3d9a03f2903	2026-05-13 05:04:14.515381+00	1
748	107	3650.30	\N	2026-05-13	allocations	102	Allocation of - Req #102	e547c81f-a9c6-4c12-af8b-a3d9a03f2903	2026-05-13 05:04:14.515773+00	1
749	110	82998.00	\N	2026-05-13	batch_sales	79	Sale for batch 12	f8a6a2fd-548b-4870-9558-b95dcb9a21e9	2026-05-13 05:12:51.617984+00	1
750	108	\N	82998.00	2026-05-13	batch_sales	79	Revenue from sale for batch 12	f8a6a2fd-548b-4870-9558-b95dcb9a21e9	2026-05-13 05:12:51.618978+00	1
751	110	54399.20	\N	2026-05-13	batch_sales	80	Sale for batch 12	aeffc86c-5584-4437-a683-b9cbe5004f08	2026-05-13 05:13:29.47011+00	1
752	108	\N	54399.20	2026-05-13	batch_sales	80	Revenue from sale for batch 12	aeffc86c-5584-4437-a683-b9cbe5004f08	2026-05-13 05:13:29.470992+00	1
755	110	35931.85	\N	2026-05-13	batch_sales	82	Sale for batch 12	bf1ea087-5bb7-4850-8800-12f1de0ab6f4	2026-05-13 05:20:15.429548+00	1
756	108	\N	35931.85	2026-05-13	batch_sales	82	Revenue from sale for batch 12	bf1ea087-5bb7-4850-8800-12f1de0ab6f4	2026-05-13 05:20:15.430123+00	1
757	103	114480.00	\N	2026-05-02	purchases	121	Purchase of 60 (item FD102)	3d4fd026-83d3-40e6-b2c4-e7d73154d93f	2026-05-19 16:27:00.276642+00	1
758	105	\N	114480.00	2026-05-02	purchases	121	Payment for purchase of 60 (item FD102)	3d4fd026-83d3-40e6-b2c4-e7d73154d93f	2026-05-19 16:27:00.287451+00	1
759	103	114480.00	\N	2026-05-06	purchases	122	Purchase of 60 (item FD102)	487105a3-7a22-44a2-9f44-03d08cb99a70	2026-05-19 16:29:21.286048+00	1
760	105	\N	114480.00	2026-05-06	purchases	122	Payment for purchase of 60 (item FD102)	487105a3-7a22-44a2-9f44-03d08cb99a70	2026-05-19 16:29:21.28644+00	1
761	103	114480.00	\N	2026-05-02	purchases	123	Purchase of 60 (item FD102)	0dcdea93-69d2-4402-bad2-85c1cd342d19	2026-05-19 16:30:15.666528+00	1
762	105	\N	114480.00	2026-05-02	purchases	123	Payment for purchase of 60 (item FD102)	0dcdea93-69d2-4402-bad2-85c1cd342d19	2026-05-19 16:30:15.666832+00	1
763	103	21088.40	\N	2026-05-03	purchases	124	Purchase of 10 (item FD101)	7d304131-e1f9-4c6f-ae02-f309c1d99c6a	2026-05-19 16:31:08.736003+00	1
764	105	\N	21088.40	2026-05-03	purchases	124	Payment for purchase of 10 (item FD101)	7d304131-e1f9-4c6f-ae02-f309c1d99c6a	2026-05-19 16:31:08.737189+00	1
765	103	95400.00	\N	2026-05-03	purchases	125	Purchase of 50 (item FD102)	ae789722-99fb-4618-a22c-fdf6e8757338	2026-05-19 16:31:48.311967+00	1
766	105	\N	95400.00	2026-05-03	purchases	125	Payment for purchase of 50 (item FD102)	ae789722-99fb-4618-a22c-fdf6e8757338	2026-05-19 16:31:48.312185+00	1
767	103	12000.00	\N	2026-05-06	purchases	126	Purchase of 240 (item FD104)	dcac9ca6-cfd9-4917-bb31-46e91f5ed4a2	2026-05-19 16:34:02.015906+00	1
768	105	\N	12000.00	2026-05-06	purchases	126	Payment for purchase of 240 (item FD104)	dcac9ca6-cfd9-4917-bb31-46e91f5ed4a2	2026-05-19 16:34:02.026394+00	1
769	103	67482.88	\N	2026-05-07	purchases	127	Purchase of 32 (item FD101)	9cfa8141-79c8-400e-8ea0-438a7b90f2bb	2026-05-19 16:35:15.186912+00	1
770	105	\N	67482.88	2026-05-07	purchases	127	Payment for purchase of 32 (item FD101)	9cfa8141-79c8-400e-8ea0-438a7b90f2bb	2026-05-19 16:35:15.19506+00	1
771	103	53424.00	\N	2026-05-07	purchases	128	Purchase of 28 (item FD102)	04fdfa10-84fc-40c2-8f3e-27be5593a167	2026-05-19 16:36:02.536528+00	1
772	105	\N	53424.00	2026-05-07	purchases	128	Payment for purchase of 28 (item FD102)	04fdfa10-84fc-40c2-8f3e-27be5593a167	2026-05-19 16:36:02.537017+00	1
775	103	115917.60	\N	2026-05-19	purchases	130	Purchase of 60 (item FD102)	93bf871d-72a9-4967-8adf-f85bcfaf08a1	2026-05-19 16:38:56.386189+00	1
776	105	\N	115917.60	2026-05-19	purchases	130	Payment for purchase of 60 (item FD102)	93bf871d-72a9-4967-8adf-f85bcfaf08a1	2026-05-19 16:38:56.386407+00	1
777	103	115917.60	\N	2026-05-09	purchases	131	Purchase of 60 (item FD102)	9051e9d0-542b-420f-9e95-d76eb4a659a6	2026-05-19 16:41:09.745998+00	1
778	105	\N	115917.60	2026-05-09	purchases	131	Payment for purchase of 60 (item FD102)	9051e9d0-542b-420f-9e95-d76eb4a659a6	2026-05-19 16:41:09.746553+00	1
779	103	10745.20	\N	2026-05-09	purchases	132	Purchase of 5 (item FD101)	41037191-8dcf-4e5b-923b-65cb81247026	2026-05-19 16:41:48.486171+00	1
780	105	\N	10745.20	2026-05-09	purchases	132	Payment for purchase of 5 (item FD101)	41037191-8dcf-4e5b-923b-65cb81247026	2026-05-19 16:41:48.486702+00	1
781	103	106257.80	\N	2026-05-09	purchases	133	Purchase of 55 (item FD102)	69b5f4a2-c380-491e-bdfc-c865e48d40e6	2026-05-19 16:42:32.156853+00	1
782	105	\N	106257.80	2026-05-09	purchases	133	Payment for purchase of 55 (item FD102)	69b5f4a2-c380-491e-bdfc-c865e48d40e6	2026-05-19 16:42:32.165624+00	1
783	103	38639.20	\N	2026-05-10	purchases	134	Purchase of 20 (item FD101)	b36f5bdb-796f-4928-b7af-2d7370ee8a70	2026-05-19 16:44:55.532159+00	1
784	105	\N	38639.20	2026-05-10	purchases	134	Payment for purchase of 20 (item FD101)	b36f5bdb-796f-4928-b7af-2d7370ee8a70	2026-05-19 16:44:55.532456+00	1
785	103	77278.40	\N	2026-05-10	purchases	135	Purchase of 40 (item FD102)	a4978dc5-753b-48d8-a8a9-a4af85a86176	2026-05-19 16:45:39.752632+00	1
786	105	\N	77278.40	2026-05-10	purchases	135	Payment for purchase of 40 (item FD102)	a4978dc5-753b-48d8-a8a9-a4af85a86176	2026-05-19 16:45:39.752844+00	1
787	103	10745.20	\N	2026-05-12	purchases	136	Purchase of 5 (item FD101)	e88abce4-7aa6-4fc3-a18a-82bf4e1d7790	2026-05-19 16:48:36.356657+00	1
788	105	\N	10745.20	2026-05-12	purchases	136	Payment for purchase of 5 (item FD101)	e88abce4-7aa6-4fc3-a18a-82bf4e1d7790	2026-05-19 16:48:36.356881+00	1
789	103	106257.80	\N	2026-05-12	purchases	137	Purchase of 55 (item FD102)	962fedd3-f2db-4209-9a34-a048998c063f	2026-05-19 16:50:24.696967+00	1
790	105	\N	106257.80	2026-05-12	purchases	137	Payment for purchase of 55 (item FD102)	962fedd3-f2db-4209-9a34-a048998c063f	2026-05-19 16:50:24.697422+00	1
791	103	42980.80	\N	2026-05-14	purchases	138	Purchase of 20 (item FD101)	c73f7c9c-2ff5-4778-b376-2758b7d318f1	2026-05-19 16:53:01.926194+00	1
792	105	\N	42980.80	2026-05-14	purchases	138	Payment for purchase of 20 (item FD101)	c73f7c9c-2ff5-4778-b376-2758b7d318f1	2026-05-19 16:53:01.92646+00	1
793	103	77278.40	\N	2026-05-14	purchases	139	Purchase of 40 (item FD102)	327006c2-7ed9-4d2f-9bc7-1469c89c28bd	2026-05-19 16:54:08.156281+00	1
794	105	\N	77278.40	2026-05-14	purchases	139	Payment for purchase of 40 (item FD102)	327006c2-7ed9-4d2f-9bc7-1469c89c28bd	2026-05-19 16:54:08.156538+00	1
795	103	21000.00	\N	2026-05-14	purchases	140	Purchase of 420 (item FD104)	a3b9b325-0589-4802-b31b-b59c97c68887	2026-05-19 17:18:24.866693+00	1
796	105	\N	21000.00	2026-05-14	purchases	140	Payment for purchase of 420 (item FD104)	a3b9b325-0589-4802-b31b-b59c97c68887	2026-05-19 17:18:24.876678+00	1
797	103	115917.60	\N	2026-05-15	purchases	141	Purchase of 60 (item FD102)	a4e7e0f2-170a-4155-9f48-d1488dfe7049	2026-05-19 18:05:49.657376+00	1
798	105	\N	115917.60	2026-05-15	purchases	141	Payment for purchase of 60 (item FD102)	a4e7e0f2-170a-4155-9f48-d1488dfe7049	2026-05-19 18:05:49.6659+00	1
801	103	53726.00	\N	2026-05-16	purchases	143	Purchase of 25 (item FD101)	0eaf8c53-e5b1-4bbd-89d4-603716033b59	2026-05-19 18:07:46.677721+00	1
802	105	\N	53726.00	2026-05-16	purchases	143	Payment for purchase of 25 (item FD101)	0eaf8c53-e5b1-4bbd-89d4-603716033b59	2026-05-19 18:07:46.686706+00	1
803	103	67618.60	\N	2026-05-16	purchases	144	Purchase of 35 (item FD102)	b393e0cd-8808-4feb-85e6-b61b4ee391ce	2026-05-19 18:08:39.886108+00	1
804	105	\N	67618.60	2026-05-16	purchases	144	Payment for purchase of 35 (item FD102)	b393e0cd-8808-4feb-85e6-b61b4ee391ce	2026-05-19 18:08:39.886673+00	1
805	103	115917.60	\N	2026-05-16	purchases	145	Purchase of 60 (item FD102)	953a7f6e-07a1-4ebd-9220-4e577a9db06a	2026-05-19 18:09:49.243934+00	1
806	105	\N	115917.60	2026-05-16	purchases	145	Payment for purchase of 60 (item FD102)	953a7f6e-07a1-4ebd-9220-4e577a9db06a	2026-05-19 18:09:49.245528+00	1
807	103	23639.44	\N	2026-05-17	purchases	146	Purchase of 11 (item FD101)	73337c94-101f-4752-a662-417cccecaf73	2026-05-19 18:10:39.986009+00	1
808	105	\N	23639.44	2026-05-17	purchases	146	Payment for purchase of 11 (item FD101)	73337c94-101f-4752-a662-417cccecaf73	2026-05-19 18:10:39.986567+00	1
809	103	94666.04	\N	2026-05-17	purchases	147	Purchase of 49 (item FD102)	85d57405-53a0-44ad-96b1-07e94735fcb7	2026-05-19 18:11:18.077829+00	1
810	105	\N	94666.04	2026-05-17	purchases	147	Payment for purchase of 49 (item FD102)	85d57405-53a0-44ad-96b1-07e94735fcb7	2026-05-19 18:11:18.085844+00	1
811	103	12000.00	\N	2026-05-17	purchases	148	Purchase of 240 (item FD104)	4981e2ef-f6ec-447b-b0dd-358ab2c46d03	2026-05-19 18:12:08.206597+00	1
812	105	\N	12000.00	2026-05-17	purchases	148	Payment for purchase of 240 (item FD104)	4981e2ef-f6ec-447b-b0dd-358ab2c46d03	2026-05-19 18:12:08.206868+00	1
815	103	121344.60	\N	2026-05-25	purchases	150	Purchase of 60 (item FD102)	e5b8921e-2ac7-456e-ae39-bde7b3ea52e1	2026-06-02 17:24:10.925385+00	1
816	105	\N	121344.60	2026-05-25	purchases	150	Payment for purchase of 60 (item FD102)	e5b8921e-2ac7-456e-ae39-bde7b3ea52e1	2026-06-02 17:24:10.925754+00	1
817	103	119334.60	\N	2026-05-21	purchases	151	Purchase of 60 (item FD102)	19fb0b4e-8d20-4eed-bda5-8cf472292b38	2026-06-02 17:25:37.317874+00	1
818	105	\N	119334.60	2026-05-21	purchases	151	Payment for purchase of 60 (item FD102)	19fb0b4e-8d20-4eed-bda5-8cf472292b38	2026-06-02 17:25:37.318344+00	1
819	103	68491.20	\N	2026-05-26	purchases	152	Purchase of 30 (item FD101)	74fcc7a6-4c96-436f-a10a-ebf2557eaf0c	2026-06-02 17:48:32.227783+00	1
820	105	\N	68491.20	2026-05-26	purchases	152	Payment for purchase of 30 (item FD101)	74fcc7a6-4c96-436f-a10a-ebf2557eaf0c	2026-06-02 17:48:32.22917+00	1
821	103	60672.30	\N	2026-05-26	purchases	153	Purchase of 30 (item FD102)	2b974189-8b49-4562-b363-40cbe3282602	2026-06-02 17:49:27.899089+00	1
822	105	\N	60672.30	2026-05-26	purchases	153	Payment for purchase of 30 (item FD102)	2b974189-8b49-4562-b363-40cbe3282602	2026-06-02 17:49:27.899586+00	1
823	103	121344.60	\N	2026-05-27	purchases	154	Purchase of 60 (item FD102)	80196b38-041c-48f3-90c9-b32656411f4c	2026-06-02 17:50:32.602669+00	1
824	105	\N	121344.60	2026-05-27	purchases	154	Payment for purchase of 60 (item FD102)	80196b38-041c-48f3-90c9-b32656411f4c	2026-06-02 17:50:32.603214+00	1
825	103	23165.40	\N	2026-05-31	purchases	155	Purchase of 10 (item FD101)	f7942f7c-eb0f-4752-9dcd-f765f8b13367	2026-06-02 17:53:33.567261+00	1
826	105	\N	23165.40	2026-05-31	purchases	155	Payment for purchase of 10 (item FD101)	f7942f7c-eb0f-4752-9dcd-f765f8b13367	2026-06-02 17:53:33.56754+00	1
827	103	102460.50	\N	2026-05-31	purchases	156	Purchase of 50 (item FD102)	d50ba24a-6a4f-4263-84c1-f49c6e401fc0	2026-06-02 17:54:14.722726+00	1
828	105	\N	102460.50	2026-05-31	purchases	156	Payment for purchase of 50 (item FD102)	d50ba24a-6a4f-4263-84c1-f49c6e401fc0	2026-06-02 17:54:14.723049+00	1
829	103	122952.60	\N	2026-06-02	purchases	157	Purchase of 60 (item FD102)	3e18e3d6-a55d-410c-9bc0-3b5e77252999	2026-06-02 17:55:39.828855+00	1
830	105	\N	122952.60	2026-06-02	purchases	157	Payment for purchase of 60 (item FD102)	3e18e3d6-a55d-410c-9bc0-3b5e77252999	2026-06-02 17:55:39.829141+00	1
831	103	18000.00	\N	2026-06-02	purchases	158	Purchase of 360 (item FD104)	94aec9d7-1998-4f96-b6b4-c9b314933808	2026-06-02 17:57:32.576869+00	1
832	105	\N	18000.00	2026-06-02	purchases	158	Payment for purchase of 360 (item FD104)	94aec9d7-1998-4f96-b6b4-c9b314933808	2026-06-02 17:57:32.577138+00	1
833	103	124359.60	\N	2026-06-04	purchases	159	Purchase of 60 (item FD102)	d1504765-a7b3-420f-9dba-84861a99e91b	2026-06-08 15:41:11.262812+00	1
834	105	\N	124359.60	2026-06-04	purchases	159	Payment for purchase of 60 (item FD102)	d1504765-a7b3-420f-9dba-84861a99e91b	2026-06-08 15:41:11.264379+00	1
835	103	124359.60	\N	2026-06-05	purchases	160	Purchase of 60 (item FD102)	46615413-81fd-4209-8caf-8bef686b363a	2026-06-08 15:42:11.202912+00	1
836	105	\N	124359.60	2026-06-05	purchases	160	Payment for purchase of 60 (item FD102)	46615413-81fd-4209-8caf-8bef686b363a	2026-06-08 15:42:11.203294+00	1
837	103	14100.00	\N	2026-06-07	purchases	161	Purchase of 6 (item FD101)	53f82df5-01b6-48b6-a466-273200101a4b	2026-06-08 15:42:48.51748+00	1
838	105	\N	14100.00	2026-06-07	purchases	161	Payment for purchase of 6 (item FD101)	53f82df5-01b6-48b6-a466-273200101a4b	2026-06-08 15:42:48.518155+00	1
839	103	111923.64	\N	2026-06-07	purchases	162	Purchase of 54 (item FD102)	74012299-1bb5-4e2c-9e32-a7fdebd25685	2026-06-08 15:43:55.348698+00	1
840	105	\N	111923.64	2026-06-07	purchases	162	Payment for purchase of 54 (item FD102)	74012299-1bb5-4e2c-9e32-a7fdebd25685	2026-06-08 15:43:55.34899+00	1
841	103	8550.00	\N	2026-06-08	purchases	163	Purchase of 180 (item FD104)	8b2f714b-fedc-4f08-8d1c-0da70751eb39	2026-06-08 15:45:28.527907+00	1
842	105	\N	8550.00	2026-06-08	purchases	163	Payment for purchase of 180 (item FD104)	8b2f714b-fedc-4f08-8d1c-0da70751eb39	2026-06-08 15:45:28.528567+00	1
843	103	9400.00	\N	2026-06-11	purchases	164	Purchase of 4 (item FD101)	3c8a8770-fc29-4df8-b94d-e9824dcda05e	2026-06-16 05:10:43.864047+00	1
844	105	\N	9400.00	2026-06-11	purchases	164	Payment for purchase of 4 (item FD101)	3c8a8770-fc29-4df8-b94d-e9824dcda05e	2026-06-16 05:10:43.865416+00	1
845	103	116068.96	\N	2026-06-11	purchases	165	Purchase of 56 (item FD102)	06f5614b-ca28-4ced-8fe6-a666be84f2ec	2026-06-16 05:11:33.011274+00	1
846	105	\N	116068.96	2026-06-11	purchases	165	Payment for purchase of 56 (item FD102)	06f5614b-ca28-4ced-8fe6-a666be84f2ec	2026-06-16 05:11:33.011938+00	1
847	103	118450.00	\N	2026-06-13	purchases	166	Purchase of 50 (item FD101)	b08b056e-83bf-4527-bdfb-7be987b7400d	2026-06-16 05:22:38.531531+00	1
848	105	\N	118450.00	2026-06-13	purchases	166	Payment for purchase of 50 (item FD101)	b08b056e-83bf-4527-bdfb-7be987b7400d	2026-06-16 05:22:38.531992+00	1
849	103	331500.00	\N	2026-06-13	purchases	167	Purchase of 150 (item FD102)	7c249f90-1891-45be-8d3f-ede835609b2a	2026-06-16 05:23:10.872215+00	1
850	105	\N	331500.00	2026-06-13	purchases	167	Payment for purchase of 150 (item FD102)	7c249f90-1891-45be-8d3f-ede835609b2a	2026-06-16 05:23:10.874182+00	1
851	103	2520.00	\N	2026-06-11	purchases	168	Purchase of 60 (item FD104)	c05cec58-b688-4961-b3cf-01c2492e55a3	2026-06-16 05:24:33.957513+00	1
852	105	\N	2520.00	2026-06-11	purchases	168	Payment for purchase of 60 (item FD104)	c05cec58-b688-4961-b3cf-01c2492e55a3	2026-06-16 05:24:33.958818+00	1
853	103	13000.00	\N	2026-06-16	purchases	169	Purchase of 200 (item FD104)	da018011-689b-4f60-90cc-10507874efb2	2026-06-16 05:26:53.816704+00	1
854	105	\N	13000.00	2026-06-16	purchases	169	Payment for purchase of 200 (item FD104)	da018011-689b-4f60-90cc-10507874efb2	2026-06-16 05:26:53.817253+00	1
855	103	\N	133440.00	2026-06-22	allocations	103	approve of (requirement 103)	abcc88a3-bc3c-453c-bf48-fd2657152129	2026-06-22 14:30:51.274447+00	1
856	107	133440.00	\N	2026-06-22	allocations	103	Allocation of - Req #103	abcc88a3-bc3c-453c-bf48-fd2657152129	2026-06-22 14:30:51.276462+00	1
857	102	1000.00	\N	2026-04-23	purchases	170	Purchase of 10 (item MD101)	f1f052e4-ea1b-481c-8db2-7ee347c6f978	2026-06-22 14:31:42.310131+00	1
858	105	\N	1000.00	2026-04-23	purchases	170	Payment for purchase of 10 (item MD101)	f1f052e4-ea1b-481c-8db2-7ee347c6f978	2026-06-22 14:31:42.311267+00	1
859	102	\N	1000.00	2026-06-22	allocations	104	approve of (requirement 104)	973b7471-c086-4f04-879e-281d37f9c5a1	2026-06-22 14:32:01.499172+00	1
860	107	1000.00	\N	2026-06-22	allocations	104	Allocation of - Req #104	973b7471-c086-4f04-879e-281d37f9c5a1	2026-06-22 14:32:01.501222+00	1
861	103	\N	5708.00	2026-06-22	allocations	105	approve of (requirement 105)	42e0d842-f88b-44b0-bf4d-d0825acbcd94	2026-06-22 14:32:59.908786+00	1
862	107	5708.00	\N	2026-06-22	allocations	105	Allocation of - Req #105	42e0d842-f88b-44b0-bf4d-d0825acbcd94	2026-06-22 14:32:59.909276+00	1
863	110	372521.04	\N	2026-06-22	batch_sales	83	Sale for batch 11	d2dc00ec-6ab2-40c0-b8b4-af28fc77741c	2026-06-22 14:36:37.086942+00	1
864	108	\N	372521.04	2026-06-22	batch_sales	83	Revenue from sale for batch 11	d2dc00ec-6ab2-40c0-b8b4-af28fc77741c	2026-06-22 14:36:37.087831+00	1
865	103	\N	40099.80	2026-06-22	allocations	106	approve of (requirement 106)	fc4aaab4-bb93-47de-ba19-7c4edd7361b0	2026-06-22 14:38:26.286396+00	1
866	107	40099.80	\N	2026-06-22	allocations	106	Allocation of - Req #106	fc4aaab4-bb93-47de-ba19-7c4edd7361b0	2026-06-22 14:38:26.287288+00	1
867	103	\N	86625.72	2026-06-22	allocations	107	approve of (requirement 107)	db895eae-ed2e-4c50-a7fb-6b6e8ebf006f	2026-06-22 14:38:51.765007+00	1
868	107	86625.72	\N	2026-06-22	allocations	107	Allocation of - Req #107	db895eae-ed2e-4c50-a7fb-6b6e8ebf006f	2026-06-22 14:38:51.765451+00	1
869	102	2000.00	\N	2026-05-01	purchases	171	Purchase of 20 (item MD101)	b4fb9369-3379-4ff7-a263-17f0183034c2	2026-06-22 14:39:49.509398+00	1
870	105	\N	2000.00	2026-05-01	purchases	171	Payment for purchase of 20 (item MD101)	b4fb9369-3379-4ff7-a263-17f0183034c2	2026-06-22 14:39:49.509877+00	1
871	103	\N	3375.27	2026-06-22	allocations	108	approve of (requirement 108)	aca324a1-5572-43f6-83b4-1f9fb33f5323	2026-06-22 14:40:05.201785+00	1
872	107	3375.27	\N	2026-06-22	allocations	108	Allocation of - Req #108	aca324a1-5572-43f6-83b4-1f9fb33f5323	2026-06-22 14:40:05.202238+00	1
879	110	221732.37	\N	2026-06-22	batch_sales	84	Sale for batch 14	037b2268-3c5b-4be5-b9e5-dc9b761b3a40	2026-06-22 14:45:23.050105+00	1
880	108	\N	221732.37	2026-06-22	batch_sales	84	Revenue from sale for batch 14	037b2268-3c5b-4be5-b9e5-dc9b761b3a40	2026-06-22 14:45:23.050569+00	1
897	103	\N	5806.00	2026-06-22	allocations	115	approve of (requirement 115)	a4d14a69-cc2a-4659-b9bb-eba564173340	2026-06-22 14:57:51.091834+00	1
898	107	5806.00	\N	2026-06-22	allocations	115	Allocation of - Req #115	a4d14a69-cc2a-4659-b9bb-eba564173340	2026-06-22 14:57:51.0921+00	1
899	102	2000.00	\N	2026-05-05	purchases	173	Purchase of 20 (item MD101)	b8403b03-0feb-47b3-b9b5-f202b4aa6ccf	2026-06-22 14:58:19.93289+00	1
900	105	\N	2000.00	2026-05-05	purchases	173	Payment for purchase of 20 (item MD101)	b8403b03-0feb-47b3-b9b5-f202b4aa6ccf	2026-06-22 14:58:19.933225+00	1
873	102	\N	2000.00	2026-06-22	allocations	109	approve of (requirement 109)	3a9a8031-7748-455f-bec6-6cdf289e5d67	2026-06-22 14:40:07.030496+00	1
874	107	2000.00	\N	2026-06-22	allocations	109	Allocation of - Req #109	3a9a8031-7748-455f-bec6-6cdf289e5d67	2026-06-22 14:40:07.030985+00	1
883	103	\N	324845.18	2026-06-22	allocations	111	approve of (requirement 111)	3f2eb07f-3ac1-4fbe-93b0-ba9f9224883c	2026-06-22 14:52:06.703596+00	1
884	107	324845.18	\N	2026-06-22	allocations	111	Allocation of - Req #111	3f2eb07f-3ac1-4fbe-93b0-ba9f9224883c	2026-06-22 14:52:06.70386+00	1
875	103	40099.80	\N	2026-06-22	stock_returns	7	Stock return for allocation line 159	37cd1377-4a72-4fab-b730-bd2f3c756a47	2026-06-22 14:42:17.841497+00	1
876	107	\N	40099.80	2026-06-22	stock_returns	7	Return reversal for allocation line 159	37cd1377-4a72-4fab-b730-bd2f3c756a47	2026-06-22 14:42:17.84177+00	1
877	103	\N	36100.00	2026-06-22	allocations	110	approve of (requirement 110)	e1a55900-ebd1-4b49-8949-2e9b1e30d514	2026-06-22 14:43:17.315614+00	1
878	107	36100.00	\N	2026-06-22	allocations	110	Allocation of - Req #110	e1a55900-ebd1-4b49-8949-2e9b1e30d514	2026-06-22 14:43:17.316801+00	1
881	110	106583.00	\N	2026-06-22	batch_sales	85	Sale for batch 12	317c225b-610b-4d74-9cbf-c72b3d787a3a	2026-06-22 14:49:53.067379+00	1
882	108	\N	106583.00	2026-06-22	batch_sales	85	Revenue from sale for batch 12	317c225b-610b-4d74-9cbf-c72b3d787a3a	2026-06-22 14:49:53.067964+00	1
889	102	\N	3500.00	2026-06-22	allocations	113	approve of (requirement 113)	68e0e57a-a5ac-4659-aaf0-d35a6dc9b13f	2026-06-22 14:53:17.20872+00	1
890	107	3500.00	\N	2026-06-22	allocations	113	Allocation of - Req #113	68e0e57a-a5ac-4659-aaf0-d35a6dc9b13f	2026-06-22 14:53:17.209087+00	1
891	110	784376.05	\N	2026-06-22	batch_sales	86	Sale for batch 16	163de57d-787b-4a32-9f3b-8c767b9a9246	2026-06-22 14:55:50.193415+00	1
892	108	\N	784376.05	2026-06-22	batch_sales	86	Revenue from sale for batch 16	163de57d-787b-4a32-9f3b-8c767b9a9246	2026-06-22 14:55:50.193788+00	1
893	110	1.00	\N	2026-06-22	batch_sales	87	Sale for batch 16	3c8956a7-617a-4ba2-a2c2-d68047c1cd0c	2026-06-22 14:56:24.576536+00	1
894	108	\N	1.00	2026-06-22	batch_sales	87	Revenue from sale for batch 16	3c8956a7-617a-4ba2-a2c2-d68047c1cd0c	2026-06-22 14:56:24.576967+00	1
885	103	\N	9842.43	2026-06-22	allocations	112	approve of (requirement 112)	24cbe703-c3e8-454d-bc16-27d105a3f015	2026-06-22 14:52:25.544918+00	1
886	107	9842.43	\N	2026-06-22	allocations	112	Allocation of - Req #112	24cbe703-c3e8-454d-bc16-27d105a3f015	2026-06-22 14:52:25.545438+00	1
887	102	3500.00	\N	2026-05-03	purchases	172	Purchase of 35 (item MD101)	532e3244-b1be-4ccd-a64b-cd9aba3364a5	2026-06-22 14:53:05.507434+00	1
888	105	\N	3500.00	2026-05-03	purchases	172	Payment for purchase of 35 (item MD101)	532e3244-b1be-4ccd-a64b-cd9aba3364a5	2026-06-22 14:53:05.507671+00	1
895	103	\N	189968.35	2026-06-22	allocations	114	approve of (requirement 114)	36db9a45-183d-4c8e-b410-b58a36597329	2026-06-22 14:57:49.646191+00	1
896	107	189968.35	\N	2026-06-22	allocations	114	Allocation of - Req #114	36db9a45-183d-4c8e-b410-b58a36597329	2026-06-22 14:57:49.647878+00	1
901	102	\N	2000.00	2026-06-22	allocations	116	approve of (requirement 116)	ea5833b9-04d1-40e5-a7a9-66fd4089525f	2026-06-22 14:58:30.786693+00	1
902	107	2000.00	\N	2026-06-22	allocations	116	Allocation of - Req #116	ea5833b9-04d1-40e5-a7a9-66fd4089525f	2026-06-22 14:58:30.788827+00	1
903	110	459171.04	\N	2026-06-22	batch_sales	88	Sale for batch 15	fb08e126-901a-4c18-b46e-737a20e127a4	2026-06-22 15:00:49.58849+00	1
904	108	\N	459171.04	2026-06-22	batch_sales	88	Revenue from sale for batch 15	fb08e126-901a-4c18-b46e-737a20e127a4	2026-06-22 15:00:49.589868+00	1
905	103	\N	201030.97	2026-06-22	allocations	117	approve of (requirement 117)	bed15bc0-23cd-40de-801f-2fdd3ff9cd71	2026-06-22 15:02:16.834738+00	1
906	107	201030.97	\N	2026-06-22	allocations	117	Allocation of - Req #117	bed15bc0-23cd-40de-801f-2fdd3ff9cd71	2026-06-22 15:02:16.835081+00	1
907	103	\N	6450.00	2026-06-22	allocations	118	approve of (requirement 118)	759f817b-5fb1-482a-81b8-cf03da204bc6	2026-06-22 15:02:24.821991+00	1
908	107	6450.00	\N	2026-06-22	allocations	118	Allocation of - Req #118	759f817b-5fb1-482a-81b8-cf03da204bc6	2026-06-22 15:02:24.822326+00	1
909	102	1000.00	\N	2026-05-08	purchases	174	Purchase of 10 (item MD101)	9212c658-b266-468c-9f8a-b171616929b9	2026-06-22 15:02:51.975572+00	1
910	105	\N	1000.00	2026-05-08	purchases	174	Payment for purchase of 10 (item MD101)	9212c658-b266-468c-9f8a-b171616929b9	2026-06-22 15:02:51.976218+00	1
911	102	\N	1000.00	2026-06-22	allocations	119	approve of (requirement 119)	3fec2b1e-0f7e-49bd-a825-2eb0da99928b	2026-06-22 15:03:03.652823+00	1
912	107	1000.00	\N	2026-06-22	allocations	119	Allocation of - Req #119	3fec2b1e-0f7e-49bd-a825-2eb0da99928b	2026-06-22 15:03:03.653951+00	1
913	110	461138.45	\N	2026-06-22	batch_sales	89	Sale for batch 17	858da901-051f-4ce2-8d01-c7e648f62e1f	2026-06-22 15:04:47.63422+00	1
914	108	\N	461138.45	2026-06-22	batch_sales	89	Revenue from sale for batch 17	858da901-051f-4ce2-8d01-c7e648f62e1f	2026-06-22 15:04:47.635438+00	1
915	103	\N	74184.63	2026-06-22	allocations	120	approve of (requirement 120)	f14a4722-0710-4fac-bd10-6e25cf167a17	2026-06-22 15:05:44.113217+00	1
916	107	74184.63	\N	2026-06-22	allocations	120	Allocation of - Req #120	f14a4722-0710-4fac-bd10-6e25cf167a17	2026-06-22 15:05:44.114241+00	1
917	103	\N	366336.00	2026-06-22	allocations	121	approve of (requirement 121)	332ed736-3031-4bc9-ae12-7c83be119d02	2026-06-22 15:06:01.307766+00	1
918	107	366336.00	\N	2026-06-22	allocations	121	Allocation of - Req #121	332ed736-3031-4bc9-ae12-7c83be119d02	2026-06-22 15:06:01.308216+00	1
919	103	\N	11450.00	2026-06-22	allocations	122	approve of (requirement 122)	de522492-4de0-4a14-b4ab-b1ff38e03b49	2026-06-22 15:06:10.775897+00	1
920	107	11450.00	\N	2026-06-22	allocations	122	Allocation of - Req #122	de522492-4de0-4a14-b4ab-b1ff38e03b49	2026-06-22 15:06:10.776306+00	1
921	102	3500.00	\N	2026-05-09	purchases	175	Purchase of 35 (item MD101)	83bc4061-95ef-489b-a7c3-9c45e3ed74b9	2026-06-22 15:06:43.713315+00	1
922	105	\N	3500.00	2026-05-09	purchases	175	Payment for purchase of 35 (item MD101)	83bc4061-95ef-489b-a7c3-9c45e3ed74b9	2026-06-22 15:06:43.713644+00	1
923	102	\N	3500.00	2026-06-22	allocations	123	approve of (requirement 123)	3be10bc9-7fc4-4287-98e0-52e924d948c3	2026-06-22 15:06:54.016851+00	1
924	107	3500.00	\N	2026-06-22	allocations	123	Allocation of - Req #123	3be10bc9-7fc4-4287-98e0-52e924d948c3	2026-06-22 15:06:54.017052+00	1
925	110	717735.75	\N	2026-06-22	batch_sales	90	Sale for batch 18	c228f488-c418-4f49-8273-3b9c3772543f	2026-06-22 15:08:30.051557+00	1
926	108	\N	717735.75	2026-06-22	batch_sales	90	Revenue from sale for batch 18	c228f488-c418-4f49-8273-3b9c3772543f	2026-06-22 15:08:30.051919+00	1
927	103	\N	54134.82	2026-06-22	allocations	124	approve of (requirement 124)	8a4ca47c-60f4-4ea2-9a51-287f553a6b6d	2026-06-22 15:09:21.447306+00	1
928	107	54134.82	\N	2026-06-22	allocations	124	Allocation of - Req #124	8a4ca47c-60f4-4ea2-9a51-287f553a6b6d	2026-06-22 15:09:21.447724+00	1
929	103	\N	114480.00	2026-06-22	allocations	125	approve of (requirement 125)	ab55bb2c-9372-4e9a-b7cb-4b3047c06fbc	2026-06-22 15:09:31.540307+00	1
930	107	114480.00	\N	2026-06-22	allocations	125	Allocation of - Req #125	ab55bb2c-9372-4e9a-b7cb-4b3047c06fbc	2026-06-22 15:09:31.540619+00	1
931	103	\N	4350.00	2026-06-22	allocations	126	approve of (requirement 126)	b7d7b1b8-057d-4c28-a3de-67ce5e40b8db	2026-06-22 15:09:42.294403+00	1
932	107	4350.00	\N	2026-06-22	allocations	126	Allocation of - Req #126	b7d7b1b8-057d-4c28-a3de-67ce5e40b8db	2026-06-22 15:09:42.294692+00	1
933	102	1000.00	\N	2026-05-18	purchases	176	Purchase of 10 (item MD101)	5c4c4353-f624-4dc7-b6d3-2729309e6c2d	2026-06-22 15:10:09.576101+00	1
934	105	\N	1000.00	2026-05-18	purchases	176	Payment for purchase of 10 (item MD101)	5c4c4353-f624-4dc7-b6d3-2729309e6c2d	2026-06-22 15:10:09.576502+00	1
935	102	\N	1000.00	2026-06-22	allocations	127	approve of (requirement 127)	337dbe19-5010-4506-9bfa-4e8ae33d8fde	2026-06-22 15:10:19.161086+00	1
936	107	1000.00	\N	2026-06-22	allocations	127	Allocation of - Req #127	337dbe19-5010-4506-9bfa-4e8ae33d8fde	2026-06-22 15:10:19.161317+00	1
937	110	185105.38	\N	2026-06-22	batch_sales	91	Sale for batch 20	bb0fd743-803f-4295-af67-3c9920a91b6d	2026-06-22 15:11:58.791296+00	1
938	108	\N	185105.38	2026-06-22	batch_sales	91	Revenue from sale for batch 20	bb0fd743-803f-4295-af67-3c9920a91b6d	2026-06-22 15:11:58.79161+00	1
939	103	\N	66164.85	2026-06-22	allocations	128	approve of (requirement 128)	713fef91-1a2b-4309-ba5e-27ddb0e7179b	2026-06-22 15:12:44.059843+00	1
940	107	66164.85	\N	2026-06-22	allocations	128	Allocation of - Req #128	713fef91-1a2b-4309-ba5e-27ddb0e7179b	2026-06-22 15:12:44.06017+00	1
941	103	\N	305280.00	2026-06-22	allocations	129	approve of (requirement 129)	8721fb3c-5091-430c-911a-f77a5cb505be	2026-06-22 15:13:04.323298+00	1
942	107	305280.00	\N	2026-06-22	allocations	129	Allocation of - Req #129	8721fb3c-5091-430c-911a-f77a5cb505be	2026-06-22 15:13:04.324224+00	1
943	103	\N	9650.00	2026-06-22	allocations	130	approve of (requirement 130)	3e79216e-9ddb-4d01-8e76-5468ceeb12a3	2026-06-22 15:13:14.799393+00	1
944	107	9650.00	\N	2026-06-22	allocations	130	Allocation of - Req #130	3e79216e-9ddb-4d01-8e76-5468ceeb12a3	2026-06-22 15:13:14.800159+00	1
945	102	2000.00	\N	2026-05-18	purchases	177	Purchase of 20 (item MD101)	502d1919-2379-472e-9cc4-4958e84a3246	2026-06-22 15:13:51.582616+00	1
946	105	\N	2000.00	2026-05-18	purchases	177	Payment for purchase of 20 (item MD101)	502d1919-2379-472e-9cc4-4958e84a3246	2026-06-22 15:13:51.583383+00	1
947	102	\N	2000.00	2026-06-22	allocations	131	approve of (requirement 131)	2c1a9501-6823-4310-9834-36ef0855ad15	2026-06-22 15:14:00.779996+00	1
948	107	2000.00	\N	2026-06-22	allocations	131	Allocation of - Req #131	2c1a9501-6823-4310-9834-36ef0855ad15	2026-06-22 15:14:00.780355+00	1
949	110	430627.92	\N	2026-06-22	batch_sales	92	Sale for batch 19	63093908-de83-403d-9457-4a4bc49f89b3	2026-06-22 15:16:09.699396+00	1
950	108	\N	430627.92	2026-06-22	batch_sales	92	Revenue from sale for batch 19	63093908-de83-403d-9457-4a4bc49f89b3	2026-06-22 15:16:09.699772+00	1
951	103	\N	30074.85	2026-06-23	allocations	132	approve of (requirement 132)	91c7d394-a3a9-4cae-925d-bed089e77582	2026-06-23 11:10:35.425068+00	1
952	107	30074.85	\N	2026-06-23	allocations	132	Allocation of - Req #132	91c7d394-a3a9-4cae-925d-bed089e77582	2026-06-23 11:10:35.425723+00	1
953	103	\N	144465.72	2026-06-23	allocations	133	approve of (requirement 133)	5836611d-3c92-4fbd-a8ba-7a5cee7a27ab	2026-06-23 11:10:49.226429+00	1
954	107	144465.72	\N	2026-06-23	allocations	133	Allocation of - Req #133	5836611d-3c92-4fbd-a8ba-7a5cee7a27ab	2026-06-23 11:10:49.228302+00	1
955	102	1500.00	\N	2026-05-14	purchases	178	Purchase of 15 (item MD101)	b4ad8709-d73a-4a1c-8ac6-5699da4eee5f	2026-06-23 11:11:17.937747+00	1
956	105	\N	1500.00	2026-05-14	purchases	178	Payment for purchase of 15 (item MD101)	b4ad8709-d73a-4a1c-8ac6-5699da4eee5f	2026-06-23 11:11:17.938796+00	1
957	102	\N	1500.00	2026-06-23	allocations	134	approve of (requirement 135)	f635c275-dd74-492b-bc18-e2dea67ac78f	2026-06-23 11:12:19.873939+00	1
958	107	1500.00	\N	2026-06-23	allocations	134	Allocation of - Req #135	f635c275-dd74-492b-bc18-e2dea67ac78f	2026-06-23 11:12:19.875267+00	1
959	103	\N	4500.00	2026-06-23	allocations	135	approve of (requirement 136)	eb02ea9d-14e7-4b44-aa71-224722491e21	2026-06-23 11:13:10.518187+00	1
960	107	4500.00	\N	2026-06-23	allocations	135	Allocation of - Req #136	eb02ea9d-14e7-4b44-aa71-224722491e21	2026-06-23 11:13:10.518689+00	1
961	110	187589.67	\N	2026-06-23	batch_sales	93	Sale for batch 21	7000026d-1dd3-4dff-8564-e3a78ff420a6	2026-06-23 11:17:38.230524+00	1
962	108	\N	187589.67	2026-06-23	batch_sales	93	Revenue from sale for batch 21	7000026d-1dd3-4dff-8564-e3a78ff420a6	2026-06-23 11:17:38.2315+00	1
963	104	61250.00	\N	2026-04-26	purchases	179	Purchase of 1750 (item SC101)	29fb5d4b-8eb8-456a-a691-fda8ff0ebd76	2026-06-23 11:37:03.652211+00	1
964	105	\N	61250.00	2026-04-26	purchases	179	Payment for purchase of 1750 (item SC101)	29fb5d4b-8eb8-456a-a691-fda8ff0ebd76	2026-06-23 11:37:03.653359+00	1
965	104	\N	61250.00	2026-06-23	batches	22	Chick allocation for batch 22 - Item: SC101	1028056f-3c37-4025-8b4f-2da00c099891	2026-06-23 11:38:12.805281+00	1
966	107	61250.00	\N	2026-06-23	batches	22	Chick expense for batch 22 - Item: SC101	1028056f-3c37-4025-8b4f-2da00c099891	2026-06-23 11:38:12.806339+00	1
967	104	99000.00	\N	2026-04-29	purchases	180	Purchase of 2805 (item SC101)	d4cc694b-0bdd-4107-9221-3db463b7ff12	2026-06-23 11:39:56.027387+00	1
968	105	\N	99000.00	2026-04-29	purchases	180	Payment for purchase of 2805 (item SC101)	d4cc694b-0bdd-4107-9221-3db463b7ff12	2026-06-23 11:39:56.028656+00	1
969	104	\N	98988.45	2026-06-23	batches	23	Chick allocation for batch 23 - Item: SC101	bdde0d6a-01c1-4882-957f-33826da107f8	2026-06-23 11:41:36.849172+00	1
970	107	98988.45	\N	2026-06-23	batches	23	Chick expense for batch 23 - Item: SC101	bdde0d6a-01c1-4882-957f-33826da107f8	2026-06-23 11:41:36.850273+00	1
971	103	\N	170012.48	2026-06-23	allocations	138	approve of (requirement 140)	20fee42c-ce08-4a76-afba-da78ab459bca	2026-06-23 13:19:12.307117+00	1
972	107	170012.48	\N	2026-06-23	allocations	138	Allocation of - Req #140	20fee42c-ce08-4a76-afba-da78ab459bca	2026-06-23 13:19:12.307779+00	1
973	103	\N	33212.95	2026-06-23	allocations	139	approve of (requirement 139)	e6449300-f8a6-4fab-8d84-3476afe2c37f	2026-06-23 13:19:18.414083+00	1
974	107	33212.95	\N	2026-06-23	allocations	139	Allocation of - Req #139	e6449300-f8a6-4fab-8d84-3476afe2c37f	2026-06-23 13:19:18.415727+00	1
975	103	\N	5200.00	2026-06-23	allocations	140	approve of (requirement 141)	c442d5b9-e7fa-4083-a265-51020af23d0f	2026-06-23 13:19:47.345949+00	1
976	107	5200.00	\N	2026-06-23	allocations	140	Allocation of - Req #141	c442d5b9-e7fa-4083-a265-51020af23d0f	2026-06-23 13:19:47.346342+00	1
977	102	1000.00	\N	2026-05-28	purchases	181	Purchase of 10 (item MD101)	1e76f93f-0455-4539-bb31-1c7a466b03b7	2026-06-23 13:21:51.021216+00	1
978	105	\N	1000.00	2026-05-28	purchases	181	Payment for purchase of 10 (item MD101)	1e76f93f-0455-4539-bb31-1c7a466b03b7	2026-06-23 13:21:51.021598+00	1
979	102	\N	1000.00	2026-06-23	allocations	141	approve of (requirement 142)	4e658d39-7616-4398-91bf-d440cbcfba5e	2026-06-23 13:22:20.88632+00	1
980	107	1000.00	\N	2026-06-23	allocations	141	Allocation of - Req #142	4e658d39-7616-4398-91bf-d440cbcfba5e	2026-06-23 13:22:20.887545+00	1
981	110	273227.11	\N	2026-06-23	batch_sales	94	Sale for batch 22	e447e221-95c6-4f9a-9218-77a1668baaca	2026-06-23 13:24:08.253692+00	1
982	108	\N	273227.11	2026-06-23	batch_sales	94	Revenue from sale for batch 22	e447e221-95c6-4f9a-9218-77a1668baaca	2026-06-23 13:24:08.254586+00	1
983	103	\N	36056.00	2026-06-23	allocations	142	approve of (requirement 143)	d4260344-7198-4781-a209-76a66efd717c	2026-06-23 13:29:11.175712+00	1
984	107	36056.00	\N	2026-06-23	allocations	142	Allocation of - Req #143	d4260344-7198-4781-a209-76a66efd717c	2026-06-23 13:29:11.17675+00	1
985	103	\N	264678.52	2026-06-23	allocations	143	approve of (requirement 144)	17f18f27-89bd-477c-9b33-79971df3cc8f	2026-06-23 13:29:36.930811+00	1
986	107	264678.52	\N	2026-06-23	allocations	143	Allocation of - Req #144	17f18f27-89bd-477c-9b33-79971df3cc8f	2026-06-23 13:29:36.931575+00	1
987	103	\N	8250.00	2026-06-23	allocations	144	approve of (requirement 145)	a418c4e5-cb9c-4f1a-bcb6-b243546d55c9	2026-06-23 13:30:27.731831+00	1
988	107	8250.00	\N	2026-06-23	allocations	144	Allocation of - Req #145	a418c4e5-cb9c-4f1a-bcb6-b243546d55c9	2026-06-23 13:30:27.732446+00	1
989	102	2000.00	\N	2026-05-28	purchases	182	Purchase of 20 (item FD102)	c69a6643-bc3c-4319-9221-620264f94cb1	2026-06-23 13:31:05.753656+00	1
990	105	\N	2000.00	2026-05-28	purchases	182	Payment for purchase of 20 (item FD102)	c69a6643-bc3c-4319-9221-620264f94cb1	2026-06-23 13:31:05.754018+00	1
991	102	2000.00	\N	2026-05-29	purchases	183	Purchase of 20 (item MD101)	40b76dfb-7813-4f85-842d-b8653a201c8b	2026-06-23 13:32:39.490797+00	1
992	105	\N	2000.00	2026-05-29	purchases	183	Payment for purchase of 20 (item MD101)	40b76dfb-7813-4f85-842d-b8653a201c8b	2026-06-23 13:32:39.491065+00	1
993	102	\N	2000.00	2026-06-23	allocations	146	approve of (requirement 146)	1a31d075-76ba-479a-99bb-cbf02ea8d266	2026-06-23 13:32:47.582975+00	1
994	107	2000.00	\N	2026-06-23	allocations	146	Allocation of - Req #146	1a31d075-76ba-479a-99bb-cbf02ea8d266	2026-06-23 13:32:47.583279+00	1
995	110	401823.35	\N	2026-06-23	batch_sales	95	Sale for batch 23	a18e5192-8eee-4c61-8361-765ff5863814	2026-06-23 13:37:40.028719+00	1
996	108	\N	401823.35	2026-06-23	batch_sales	95	Revenue from sale for batch 23	a18e5192-8eee-4c61-8361-765ff5863814	2026-06-23 13:37:40.029173+00	1
997	103	63925.12	\N	2026-06-21	purchases	184	Purchase of 28 (item FD101)	1d462b0e-8a44-47cf-b850-c4eb8a049b88	2026-06-23 18:04:18.167622+00	1
998	105	\N	63925.12	2026-06-21	purchases	184	Payment for purchase of 28 (item FD101)	1d462b0e-8a44-47cf-b850-c4eb8a049b88	2026-06-23 18:04:18.16881+00	1
1001	103	67190.40	\N	2026-06-21	purchases	186	Purchase of 32 (item FD102)	5990766d-54a9-4de1-8032-9aa87b0f96c1	2026-06-23 18:06:16.204792+00	1
1002	105	\N	67190.40	2026-06-21	purchases	186	Payment for purchase of 32 (item FD102)	5990766d-54a9-4de1-8032-9aa87b0f96c1	2026-06-23 18:06:16.205099+00	1
1003	103	30537.00	\N	2026-06-21	purchases	187	Purchase of 13 (item FD101)	1aa770d5-c962-4e18-bedc-995481bb0338	2026-06-23 18:08:06.140985+00	1
1004	105	\N	30537.00	2026-06-21	purchases	187	Payment for purchase of 13 (item FD101)	1aa770d5-c962-4e18-bedc-995481bb0338	2026-06-23 18:08:06.142255+00	1
1005	103	409530.00	\N	2026-06-21	purchases	188	Purchase of 187 (item FD102)	69f910eb-db27-440b-a5d2-5b7af83245a9	2026-06-23 18:10:11.557398+00	1
1006	105	\N	409530.00	2026-06-21	purchases	188	Payment for purchase of 187 (item FD102)	69f910eb-db27-440b-a5d2-5b7af83245a9	2026-06-23 18:10:11.557811+00	1
1007	103	4800.00	\N	2026-06-21	purchases	189	Purchase of 100 (item FD104)	8b8e4df3-64b5-4263-bdc7-95f2598ef283	2026-06-23 18:12:41.366272+00	1
1008	105	\N	4800.00	2026-06-21	purchases	189	Payment for purchase of 100 (item FD104)	8b8e4df3-64b5-4263-bdc7-95f2598ef283	2026-06-23 18:12:41.366701+00	1
1009	104	137499.32	\N	2026-05-15	purchases	190	Purchase of 2550 (item SC101)	f8494747-25b7-4ec3-ab80-186e1134a65b	2026-06-24 11:59:26.486286+00	1
1010	105	\N	137499.32	2026-05-15	purchases	190	Payment for purchase of 2550 (item SC101)	f8494747-25b7-4ec3-ab80-186e1134a65b	2026-06-24 11:59:26.487375+00	1
1011	104	\N	137496.00	2026-06-24	batches	24	Chick allocation for batch 24 - Item: SC101	d6de9794-3f75-4296-a11b-3efa98707ec8	2026-06-24 12:00:00.683528+00	1
1012	107	137496.00	\N	2026-06-24	batches	24	Chick expense for batch 24 - Item: SC101	d6de9794-3f75-4296-a11b-3efa98707ec8	2026-06-24 12:00:00.684512+00	1
1013	103	\N	500.00	2026-06-24	allocations	148	approve of (requirement 148)	11220fc2-f1ae-4d40-937a-129e443e7b61	2026-06-24 12:01:00.856376+00	1
1014	107	500.00	\N	2026-06-24	allocations	148	Allocation of - Req #148	11220fc2-f1ae-4d40-937a-129e443e7b61	2026-06-24 12:01:00.857364+00	1
1015	103	\N	227971.28	2026-06-24	allocations	149	approve of (requirement 149)	7005d6ef-e56b-4d09-b6a9-265372991def	2026-06-24 12:01:13.118181+00	1
1016	107	227971.28	\N	2026-06-24	allocations	149	Allocation of - Req #149	7005d6ef-e56b-4d09-b6a9-265372991def	2026-06-24 12:01:13.119146+00	1
1017	103	\N	5900.00	2026-06-24	allocations	150	approve of (requirement 150)	8e59a15c-32f2-4204-9204-c99c8d142f7c	2026-06-24 12:03:48.708522+00	1
1018	107	5900.00	\N	2026-06-24	allocations	150	Allocation of - Req #150	8e59a15c-32f2-4204-9204-c99c8d142f7c	2026-06-24 12:03:48.709634+00	1
1019	102	2000.00	\N	2026-04-30	purchases	191	Purchase of 20 (item MD101)	a0bc39d4-e837-4e00-a4d8-c6d9775e7ae3	2026-06-24 12:11:37.264637+00	1
1020	105	\N	2000.00	2026-04-30	purchases	191	Payment for purchase of 20 (item MD101)	a0bc39d4-e837-4e00-a4d8-c6d9775e7ae3	2026-06-24 12:11:37.265427+00	1
1021	102	\N	2000.00	2026-06-24	allocations	151	approve of (requirement 151)	ef4b235a-5471-4702-9d64-314e42c7d3b6	2026-06-24 12:11:47.618058+00	1
1022	107	2000.00	\N	2026-06-24	allocations	151	Allocation of - Req #151	ef4b235a-5471-4702-9d64-314e42c7d3b6	2026-06-24 12:11:47.61868+00	1
1023	110	260561.25	\N	2026-06-24	batch_sales	96	Sale for batch 24	db874ac4-34b6-4cb6-90a4-f899b9e5162d	2026-06-24 12:14:50.061514+00	1
1024	108	\N	260561.25	2026-06-24	batch_sales	96	Revenue from sale for batch 24	db874ac4-34b6-4cb6-90a4-f899b9e5162d	2026-06-24 12:14:50.062039+00	1
1035	102	1500.00	\N	2026-05-12	purchases	193	Purchase of 15 (item MD101)	4cc4e7d4-a074-4a3f-9f0d-cbd66bdff435	2026-06-24 12:23:16.741567+00	1
1036	105	\N	1500.00	2026-05-12	purchases	193	Payment for purchase of 15 (item MD101)	4cc4e7d4-a074-4a3f-9f0d-cbd66bdff435	2026-06-24 12:23:16.741988+00	1
1025	104	109928.35	\N	2026-05-01	purchases	192	Purchase of 3115 (item SC101)	a61bf4f7-2856-4a95-9eb9-6df69fea0053	2026-06-24 12:18:29.484315+00	1
1026	105	\N	109928.35	2026-05-01	purchases	192	Payment for purchase of 3115 (item SC101)	a61bf4f7-2856-4a95-9eb9-6df69fea0053	2026-06-24 12:18:29.48494+00	1
1027	104	\N	109928.35	2026-06-24	batches	25	Chick allocation for batch 25 - Item: SC101	cb3fde5f-6f94-462d-8574-25c4c8107987	2026-06-24 12:18:59.79028+00	1
1028	107	109928.35	\N	2026-06-24	batches	25	Chick expense for batch 25 - Item: SC101	cb3fde5f-6f94-462d-8574-25c4c8107987	2026-06-24 12:18:59.791352+00	1
1033	103	\N	9200.00	2026-06-24	allocations	155	approve of (requirement 155)	24036a1f-d870-4fcb-b4d4-0e90210ed907	2026-06-24 12:21:37.324407+00	1
1034	107	9200.00	\N	2026-06-24	allocations	155	Allocation of - Req #155	24036a1f-d870-4fcb-b4d4-0e90210ed907	2026-06-24 12:21:37.324844+00	1
1039	110	401823.35	\N	2026-06-24	batch_sales	97	Sale for batch 25	3503cfc0-3c94-4250-af35-eda6727eb6b8	2026-06-24 12:26:04.418295+00	1
1040	108	\N	401823.35	2026-06-24	batch_sales	97	Revenue from sale for batch 25	3503cfc0-3c94-4250-af35-eda6727eb6b8	2026-06-24 12:26:04.418827+00	1
1041	104	43275.54	\N	2026-05-08	purchases	194	Purchase of 1479 (item SC101)	ea818ab8-e855-43f1-b6de-802bcc2ebd5b	2026-06-24 12:30:16.718723+00	1
1042	105	\N	43275.54	2026-05-08	purchases	194	Payment for purchase of 1479 (item SC101)	ea818ab8-e855-43f1-b6de-802bcc2ebd5b	2026-06-24 12:30:16.718977+00	1
1045	103	\N	300.00	2026-06-24	allocations	158	approve of (requirement 158)	d71215e2-4f19-4bbf-807c-78298a26afd2	2026-06-24 12:30:56.962132+00	1
1046	107	300.00	\N	2026-06-24	allocations	158	Allocation of - Req #158	d71215e2-4f19-4bbf-807c-78298a26afd2	2026-06-24 12:30:56.962502+00	1
1029	103	\N	600.00	2026-06-24	allocations	153	approve of (requirement 153)	7806911c-78b7-4f57-8e91-57dd4c6ef1d5	2026-06-24 12:20:44.468938+00	1
1030	107	600.00	\N	2026-06-24	allocations	153	Allocation of - Req #153	7806911c-78b7-4f57-8e91-57dd4c6ef1d5	2026-06-24 12:20:44.469485+00	1
1031	103	\N	299799.84	2026-06-24	allocations	154	approve of (requirement 154)	d741bff2-4fbe-47b3-a84c-65666d399260	2026-06-24 12:21:26.562023+00	1
1032	107	299799.84	\N	2026-06-24	allocations	154	Allocation of - Req #154	d741bff2-4fbe-47b3-a84c-65666d399260	2026-06-24 12:21:26.56229+00	1
1037	102	\N	1500.00	2026-06-24	allocations	156	approve of (requirement 156)	c7d4ddc1-752b-4db8-af47-102e95795332	2026-06-24 12:24:10.399832+00	1
1038	107	1500.00	\N	2026-06-24	allocations	156	Allocation of - Req #156	c7d4ddc1-752b-4db8-af47-102e95795332	2026-06-24 12:24:10.400248+00	1
1043	104	\N	43275.54	2026-06-24	batches	26	Chick allocation for batch 26 - Item: SC101	6282801d-0ae4-4818-8eac-75c1b4316504	2026-06-24 12:30:34.960147+00	1
1044	107	43275.54	\N	2026-06-24	batches	26	Chick expense for batch 26 - Item: SC101	6282801d-0ae4-4818-8eac-75c1b4316504	2026-06-24 12:30:34.961336+00	1
1047	103	\N	102472.91	2026-06-24	allocations	159	approve of (requirement 159)	f33a7287-6897-428c-8b90-9e5a57aa0702	2026-06-24 12:31:10.963274+00	1
1048	107	102472.91	\N	2026-06-24	allocations	159	Allocation of - Req #159	f33a7287-6897-428c-8b90-9e5a57aa0702	2026-06-24 12:31:10.964438+00	1
1049	103	\N	3300.00	2026-06-24	allocations	160	approve of (requirement 160)	456fda4e-38ca-487a-8fa4-1d3f57e9b50f	2026-06-24 12:31:21.091522+00	1
1050	107	3300.00	\N	2026-06-24	allocations	160	Allocation of - Req #160	456fda4e-38ca-487a-8fa4-1d3f57e9b50f	2026-06-24 12:31:21.091985+00	1
1051	102	1000.00	\N	2026-06-10	purchases	195	Purchase of 10 (item MD101)	23228962-bcdf-40a8-8a30-f7d17a24ed55	2026-06-24 12:32:24.390798+00	1
1052	105	\N	1000.00	2026-06-10	purchases	195	Payment for purchase of 10 (item MD101)	23228962-bcdf-40a8-8a30-f7d17a24ed55	2026-06-24 12:32:24.391135+00	1
1053	102	\N	1000.00	2026-06-24	allocations	161	approve of (requirement 161)	b0e13d1d-c697-4802-bb42-82cb35eaad92	2026-06-24 12:32:34.85581+00	1
1054	107	1000.00	\N	2026-06-24	allocations	161	Allocation of - Req #161	b0e13d1d-c697-4802-bb42-82cb35eaad92	2026-06-24 12:32:34.856112+00	1
1061	103	\N	42160.00	2026-06-24	purchases	115	Reversal: mistaken purchase 115 (FD101 qty/cost swap)	c0e48030-b33c-4aa8-a2b4-4178d2fcd944	2026-06-24 14:04:58.944145+00	1
1062	105	42160.00	\N	2026-06-24	purchases	115	Reversal: mistaken purchase 115 (FD101 qty/cost swap)	e760dd8c-2a5a-4951-a719-24e717390f9f	2026-06-24 14:04:58.944145+00	1
1065	103	4341.60	\N	2026-06-24	purchases	134	Correction: purchase 134 unit cost 1931.96 → 2149.04	9b758312-c3e4-469d-bc3f-ac518af07301	2026-06-24 14:12:50.345584+00	1
1066	105	\N	4341.60	2026-06-24	purchases	134	Correction: purchase 134 unit cost 1931.96 → 2149.04	a99fa0df-a70a-462b-97bf-b2c7c4e0db64	2026-06-24 14:12:50.345584+00	1
1069	110	234042.68	\N	2026-06-30	batch_sales	98	Sale for batch 26	96fe56a1-ebe7-4f65-a4cd-2597b1764415	2026-06-30 14:25:54.450237+00	1
1070	108	\N	234042.68	2026-06-30	batch_sales	98	Revenue from sale for batch 26	96fe56a1-ebe7-4f65-a4cd-2597b1764415	2026-06-30 14:25:54.452173+00	1
1071	104	54064.64	\N	2026-05-10	purchases	196	Purchase of 1724 (item SC101)	f386241c-2d84-4f89-9f8f-b14be5c827c4	2026-06-30 14:28:58.499177+00	1
1072	105	\N	54064.64	2026-05-10	purchases	196	Payment for purchase of 1724 (item SC101)	f386241c-2d84-4f89-9f8f-b14be5c827c4	2026-06-30 14:28:58.500031+00	1
1073	104	\N	54064.64	2026-06-30	batches	27	Chick allocation for batch 27 - Item: SC101	45eeea12-9800-42cc-8563-38d4ecbbf2fd	2026-06-30 14:30:15.90889+00	1
1074	107	54064.64	\N	2026-06-30	batches	27	Chick expense for batch 27 - Item: SC101	45eeea12-9800-42cc-8563-38d4ecbbf2fd	2026-06-30 14:30:15.909866+00	1
1075	103	\N	36533.68	2026-06-30	allocations	163	approve of (requirement 163)	65d629b4-d51f-427b-9a51-2e1922fad42f	2026-06-30 14:30:38.635428+00	1
1076	107	36533.68	\N	2026-06-30	allocations	163	Allocation of - Req #163	65d629b4-d51f-427b-9a51-2e1922fad42f	2026-06-30 14:30:38.635994+00	1
1077	103	\N	179994.49	2026-06-30	allocations	164	approve of (requirement 164)	16360657-7c81-4618-987e-a8d8964b4c32	2026-06-30 14:31:02.352837+00	1
1078	107	179994.49	\N	2026-06-30	allocations	164	Allocation of - Req #164	16360657-7c81-4618-987e-a8d8964b4c32	2026-06-30 14:31:02.353599+00	1
1079	103	\N	5300.00	2026-06-30	allocations	165	approve of (requirement 165)	f0cbc32d-50b0-45df-9be0-45689fa84931	2026-06-30 14:32:34.372635+00	1
1080	107	5300.00	\N	2026-06-30	allocations	165	Allocation of - Req #165	f0cbc32d-50b0-45df-9be0-45689fa84931	2026-06-30 14:32:34.373107+00	1
1081	102	5000.00	\N	2026-06-01	purchases	197	Purchase of 50 (item MD101)	1d220e38-1090-4425-834a-44e305b9ea02	2026-06-30 14:33:19.288252+00	1
1082	105	\N	5000.00	2026-06-01	purchases	197	Payment for purchase of 50 (item MD101)	1d220e38-1090-4425-834a-44e305b9ea02	2026-06-30 14:33:19.289699+00	1
1083	102	\N	1000.00	2026-06-30	allocations	166	approve of (requirement 166)	2703fbf2-9a3e-4c43-aca8-0504547e4127	2026-06-30 14:33:33.375323+00	1
1084	107	1000.00	\N	2026-06-30	allocations	166	Allocation of - Req #166	2703fbf2-9a3e-4c43-aca8-0504547e4127	2026-06-30 14:33:33.37569+00	1
1085	110	291968.09	\N	2026-06-30	batch_sales	99	Sale for batch 27	e741a043-a0ab-4f36-969a-7b578e9d276e	2026-06-30 14:34:34.282372+00	1
1086	108	\N	291968.09	2026-06-30	batch_sales	99	Revenue from sale for batch 27	e741a043-a0ab-4f36-969a-7b578e9d276e	2026-06-30 14:34:34.282884+00	1
1089	104	65822.05	\N	2026-06-13	purchases	199	Purchase of 2135 (item SC101)	ce1c0dbd-c21b-46d2-a607-87b0cd72562f	2026-07-01 05:15:42.580552+00	1
1090	105	\N	65822.05	2026-06-13	purchases	199	Payment for purchase of 2135 (item SC101)	ce1c0dbd-c21b-46d2-a607-87b0cd72562f	2026-07-01 05:15:42.58114+00	1
1091	104	\N	65822.05	2026-07-01	batches	28	Chick allocation for batch 28 - Item: SC101	b2202eca-5f33-4ae4-a414-6faceb8c3993	2026-07-01 05:17:25.228717+00	1
1092	107	65822.05	\N	2026-07-01	batches	28	Chick expense for batch 28 - Item: SC101	b2202eca-5f33-4ae4-a414-6faceb8c3993	2026-07-01 05:17:25.230747+00	1
1093	103	\N	42980.80	2026-07-01	allocations	168	approve of (requirement 168)	f98bae55-bc5f-4304-bc92-62d7a9e29fa0	2026-07-01 05:18:12.339106+00	1
1094	107	42980.80	\N	2026-07-01	allocations	168	Allocation of - Req #168	f98bae55-bc5f-4304-bc92-62d7a9e29fa0	2026-07-01 05:18:12.340355+00	1
1095	103	\N	126197.81	2026-07-01	allocations	169	approve of (requirement 169)	35c70f9e-342d-4987-9ad7-5ede2b529077	2026-07-01 05:18:14.656549+00	1
1096	107	126197.81	\N	2026-07-01	allocations	169	Allocation of - Req #169	35c70f9e-342d-4987-9ad7-5ede2b529077	2026-07-01 05:18:14.656849+00	1
1097	103	\N	5050.00	2026-07-01	allocations	170	approve of (requirement 170)	0494cfdc-a705-4099-96d7-420fd1ead216	2026-07-01 05:18:39.059187+00	1
1098	107	5050.00	\N	2026-07-01	allocations	170	Allocation of - Req #170	0494cfdc-a705-4099-96d7-420fd1ead216	2026-07-01 05:18:39.059517+00	1
1099	102	\N	1000.00	2026-07-01	allocations	171	approve of (requirement 171)	fda9c597-0519-46df-84ab-dcd46b4ebac7	2026-07-01 05:18:52.165528+00	1
1100	107	1000.00	\N	2026-07-01	allocations	171	Allocation of - Req #171	fda9c597-0519-46df-84ab-dcd46b4ebac7	2026-07-01 05:18:52.166617+00	1
1103	103	95085.68	\N	2026-07-04	purchases	201	Purchase of 46 (item FD102)	86d90aba-2bb6-4aa4-a67e-73642e241f3f	2026-07-12 18:10:51.470354+00	1
1104	105	\N	95085.68	2026-07-04	purchases	201	Payment for purchase of 46 (item FD102)	86d90aba-2bb6-4aa4-a67e-73642e241f3f	2026-07-12 18:10:51.470713+00	1
1105	103	31470.88	\N	2026-07-04	purchases	202	Purchase of 14 (item FD101)	626acc2e-c5b4-47f6-8df1-dd33b8c26549	2026-07-12 18:12:21.64903+00	1
1106	105	\N	31470.88	2026-07-04	purchases	202	Payment for purchase of 14 (item FD101)	626acc2e-c5b4-47f6-8df1-dd33b8c26549	2026-07-12 18:12:21.649494+00	1
1109	103	55177.00	\N	2026-07-05	purchases	204	Purchase of 23 (item FD101)	548a4016-f912-4fc8-bcf6-f1dfab0bd1e6	2026-07-12 18:15:48.782389+00	1
1110	105	\N	55177.00	2026-07-05	purchases	204	Payment for purchase of 23 (item FD101)	548a4016-f912-4fc8-bcf6-f1dfab0bd1e6	2026-07-12 18:15:48.782708+00	1
1111	103	396480.00	\N	2026-07-05	purchases	205	Purchase of 177 (item FD102)	94eebd2e-e8d6-4274-816b-da27e04f9897	2026-07-12 18:16:53.221532+00	1
1112	105	\N	396480.00	2026-07-05	purchases	205	Payment for purchase of 177 (item FD102)	94eebd2e-e8d6-4274-816b-da27e04f9897	2026-07-12 18:16:53.221823+00	1
1113	103	119950.00	\N	2026-07-16	purchases	206	Purchase of 50 (item FD101)	93e0cc69-ded5-4f23-8abb-efdd98a13dfe	2026-07-22 14:54:58.452894+00	1
1114	105	\N	119950.00	2026-07-16	purchases	206	Payment for purchase of 50 (item FD101)	93e0cc69-ded5-4f23-8abb-efdd98a13dfe	2026-07-22 14:54:58.454346+00	1
1115	103	336000.00	\N	2026-07-16	purchases	207	Purchase of 150 (item FD102)	3224f20f-f5ad-486d-bbbe-c186a98c1a67	2026-07-22 14:56:06.855867+00	1
1116	105	\N	336000.00	2026-07-16	purchases	207	Payment for purchase of 150 (item FD102)	3224f20f-f5ad-486d-bbbe-c186a98c1a67	2026-07-22 14:56:06.856817+00	1
1117	103	13500.00	\N	2026-07-16	purchases	208	Purchase of 200 (item FD104)	28c86dd5-fac7-46bf-938f-3ec927e169f8	2026-07-22 14:57:37.58504+00	1
1118	105	\N	13500.00	2026-07-16	purchases	208	Payment for purchase of 200 (item FD104)	28c86dd5-fac7-46bf-938f-3ec927e169f8	2026-07-22 14:57:37.585685+00	1
1119	103	52461.16	\N	2026-07-15	purchases	209	Purchase of 23 (item FD101)	afb88c64-6c1d-4fca-8ad6-9f9a151f7a53	2026-07-22 15:02:45.010127+00	1
1120	105	\N	52461.16	2026-07-15	purchases	209	Payment for purchase of 23 (item FD101)	afb88c64-6c1d-4fca-8ad6-9f9a151f7a53	2026-07-22 15:02:45.010514+00	1
1121	103	77947.16	\N	2026-07-15	purchases	210	Purchase of 37 (item FD102)	3a7c7c94-c95a-4332-880a-fa7c56ded7c5	2026-07-22 15:03:43.188309+00	1
1122	105	\N	77947.16	2026-07-15	purchases	210	Payment for purchase of 37 (item FD102)	3a7c7c94-c95a-4332-880a-fa7c56ded7c5	2026-07-22 15:03:43.188601+00	1
1123	103	34695.00	\N	2026-07-21	purchases	211	Purchase of 15 (item FD101)	d3a8eea0-17ef-4422-a390-06b78ede0dfd	2026-07-22 15:05:00.247135+00	1
1124	105	\N	34695.00	2026-07-21	purchases	211	Payment for purchase of 15 (item FD101)	d3a8eea0-17ef-4422-a390-06b78ede0dfd	2026-07-22 15:05:00.247383+00	1
1125	103	96285.60	\N	2026-07-21	purchases	212	Purchase of 45 (item FD102)	4cd6d03f-07e1-42dd-bbfe-bd97ae5fd1ad	2026-07-22 15:05:44.16649+00	1
1126	105	\N	96285.60	2026-07-21	purchases	212	Payment for purchase of 45 (item FD102)	4cd6d03f-07e1-42dd-bbfe-bd97ae5fd1ad	2026-07-22 15:05:44.166757+00	1
1127	103	11565.00	\N	2026-07-26	purchases	213	Purchase of 5 (item FD101)	b837a502-34f2-454a-b88b-43f00fcc4949	2026-07-26 17:38:12.699212+00	1
1128	105	\N	11565.00	2026-07-26	purchases	213	Payment for purchase of 5 (item FD101)	b837a502-34f2-454a-b88b-43f00fcc4949	2026-07-26 17:38:12.700548+00	1
1129	103	117682.40	\N	2026-07-26	purchases	214	Purchase of 55 (item FD102)	33501f5c-f963-4c3e-986d-de03453fc769	2026-07-26 17:38:47.156116+00	1
1130	105	\N	117682.40	2026-07-26	purchases	214	Payment for purchase of 55 (item FD102)	33501f5c-f963-4c3e-986d-de03453fc769	2026-07-26 17:38:47.15656+00	1
1131	103	35332.50	\N	2026-07-30	purchases	215	Purchase of 15 (item FD101)	2447a2bd-40a1-4c9c-b250-9083acf7c6b8	2026-07-31 16:57:24.430791+00	1
1132	105	\N	35332.50	2026-07-30	purchases	215	Payment for purchase of 15 (item FD101)	2447a2bd-40a1-4c9c-b250-9083acf7c6b8	2026-07-31 16:57:24.431879+00	1
1133	103	97770.60	\N	2026-07-30	purchases	216	Purchase of 45 (item FD102)	73eef65d-2400-4c51-97bc-b5f2e1ab2d5e	2026-07-31 17:00:06.517961+00	1
1134	105	\N	97770.60	2026-07-30	purchases	216	Payment for purchase of 45 (item FD102)	73eef65d-2400-4c51-97bc-b5f2e1ab2d5e	2026-07-31 17:00:06.518345+00	1
1135	103	130360.80	\N	2026-08-04	purchases	217	Purchase of 60 (item FD102)	62d0e0dc-393c-461a-9436-d46971f2c01d	2026-08-05 18:29:19.507601+00	1
1136	105	\N	130360.80	2026-08-04	purchases	217	Payment for purchase of 60 (item FD102)	62d0e0dc-393c-461a-9436-d46971f2c01d	2026-08-05 18:29:19.511049+00	1
1137	103	146040.00	\N	2026-08-02	purchases	218	Purchase of 60 (item FD101)	624abc1c-a9cb-41ed-9cc1-be45bc28a83a	2026-08-05 18:30:17.691961+00	1
1138	105	\N	146040.00	2026-08-02	purchases	218	Payment for purchase of 60 (item FD101)	624abc1c-a9cb-41ed-9cc1-be45bc28a83a	2026-08-05 18:30:17.692348+00	1
1139	103	318500.00	\N	2026-08-02	purchases	219	Purchase of 140 (item FD102)	3aa21695-f7bd-4746-babd-caab8a85d540	2026-08-05 18:30:54.478734+00	1
1140	105	\N	318500.00	2026-08-02	purchases	219	Payment for purchase of 140 (item FD102)	3aa21695-f7bd-4746-babd-caab8a85d540	2026-08-05 18:30:54.479059+00	1
1141	104	50000.00	\N	2026-08-16	purchases	220	Purchase of 1000 (item SC101)	e638397b-56f0-49bd-89eb-f031b948df57	2026-08-17 03:51:34.667245+00	1
1142	105	\N	50000.00	2026-08-16	purchases	220	Payment for purchase of 1000 (item SC101)	e638397b-56f0-49bd-89eb-f031b948df57	2026-08-17 03:51:34.669091+00	1
1143	104	\N	50000.00	2026-08-17	batches	37	Chick allocation for batch 37 - Item: SC101	3a746775-b4d2-412e-94b0-d58e8625b7f8	2026-08-17 14:03:21.759649+00	1
1144	107	50000.00	\N	2026-08-17	batches	37	Chick expense for batch 37 - Item: SC101	3a746775-b4d2-412e-94b0-d58e8625b7f8	2026-08-17 14:03:21.760699+00	1
1145	103	\N	21490.40	2026-08-17	allocations	173	approve of (requirement 174)	eec25519-606b-4d8a-b29d-e877a5c5df68	2026-08-17 14:04:13.319014+00	1
1146	107	21490.40	\N	2026-08-17	allocations	173	Allocation of - Req #174	eec25519-606b-4d8a-b29d-e877a5c5df68	2026-08-17 14:04:13.320323+00	1
1147	103	\N	21900.00	2026-08-18	allocations	174	approve of (requirement 175)	2b5ae420-c715-47f9-abfa-89589072f5f5	2026-08-18 06:54:52.131762+00	1
1148	107	21900.00	\N	2026-08-18	allocations	174	Allocation of - Req #175	2b5ae420-c715-47f9-abfa-89589072f5f5	2026-08-18 06:54:52.13299+00	1
1149	103	\N	3564.80	2026-08-18	allocations	175	approve of (requirement 176)	e09edb5a-3126-41d5-b291-6f29e5a4c235	2026-08-18 06:55:42.079875+00	1
1150	107	3564.80	\N	2026-08-18	allocations	175	Allocation of - Req #176	e09edb5a-3126-41d5-b291-6f29e5a4c235	2026-08-18 06:55:42.080669+00	1
1151	101	20000.00	\N	2026-08-18	batch_sales	100	Sale for batch 38	99af3209-6d25-4598-9c02-205d1bd78aa9	2026-08-18 07:10:07.491462+00	2
1152	108	\N	20000.00	2026-08-18	batch_sales	100	Revenue from sale for batch 38	99af3209-6d25-4598-9c02-205d1bd78aa9	2026-08-18 07:10:07.493163+00	2
1153	101	50500.00	\N	2026-08-18	batch_sales	101	Sale for batch 38	fa6be42e-df8a-45ee-978d-93f6c184daf8	2026-08-18 09:46:53.203877+00	2
1154	108	\N	50500.00	2026-08-18	batch_sales	101	Revenue from sale for batch 38	fa6be42e-df8a-45ee-978d-93f6c184daf8	2026-08-18 09:46:53.205389+00	2
1155	103	\N	23990.00	2026-08-18	allocations	176	approve of (requirement 177)	9142b8a3-6e9a-43d7-a036-5ead210b17da	2026-08-18 14:09:52.5391+00	1
1156	107	23990.00	\N	2026-08-18	allocations	176	Allocation of - Req #177	9142b8a3-6e9a-43d7-a036-5ead210b17da	2026-08-18 14:09:52.540426+00	1
1161	103	130360.80	\N	2026-08-09	purchases	223	Purchase of 60 (item FD102)	528f9948-e8db-41b0-9963-5e8621dd6c4c	2026-08-19 17:50:42.142488+00	1
1162	105	\N	130360.80	2026-08-09	purchases	223	Payment for purchase of 60 (item FD102)	528f9948-e8db-41b0-9963-5e8621dd6c4c	2026-08-19 17:50:42.142948+00	1
1163	103	43453.60	\N	2026-08-13	purchases	224	Purchase of 20 (item FD102)	92523439-c8cf-4a3c-a262-dc953f112098	2026-08-19 17:51:21.34227+00	1
1164	105	\N	43453.60	2026-08-13	purchases	224	Payment for purchase of 20 (item FD102)	92523439-c8cf-4a3c-a262-dc953f112098	2026-08-19 17:51:21.342624+00	1
1165	103	84927.20	\N	2026-08-13	purchases	225	Purchase of 40 (item FD103)	fb38bdc6-558c-4ec1-8402-15452c6894eb	2026-08-19 17:52:11.729839+00	1
1166	105	\N	84927.20	2026-08-13	purchases	225	Payment for purchase of 40 (item FD103)	fb38bdc6-558c-4ec1-8402-15452c6894eb	2026-08-19 17:52:11.730168+00	1
1167	103	127390.80	\N	2026-08-17	purchases	226	Purchase of 60 (item FD103)	d9d2706f-1524-4dab-ba45-409d4e71daff	2026-08-19 17:53:25.35318+00	1
1168	105	\N	127390.80	2026-08-17	purchases	226	Payment for purchase of 60 (item FD103)	d9d2706f-1524-4dab-ba45-409d4e71daff	2026-08-19 17:53:25.353511+00	1
1169	103	18000.00	\N	2026-08-17	purchases	227	Purchase of 300 (item FD104)	7e0cbd77-7c55-460f-930b-b26b640d99b8	2026-08-19 17:58:17.058438+00	1
1170	105	\N	18000.00	2026-08-17	purchases	227	Payment for purchase of 300 (item FD104)	7e0cbd77-7c55-460f-930b-b26b640d99b8	2026-08-19 17:58:17.058766+00	1
1171	103	61600.00	\N	2026-08-18	purchases	228	Purchase of 25 (item FD101)	008288b7-26ea-4bc4-8151-1b3fa815f159	2026-08-19 17:59:23.084676+00	1
1172	105	\N	61600.00	2026-08-18	purchases	228	Payment for purchase of 25 (item FD101)	008288b7-26ea-4bc4-8151-1b3fa815f159	2026-08-19 17:59:23.084992+00	1
1173	103	196775.00	\N	2026-08-18	purchases	229	Purchase of 85 (item FD102)	3d7fb347-cb34-4e7f-8836-19ad4ba6ff90	2026-08-19 17:59:57.685167+00	1
1174	105	\N	196775.00	2026-08-18	purchases	229	Payment for purchase of 85 (item FD102)	3d7fb347-cb34-4e7f-8836-19ad4ba6ff90	2026-08-19 17:59:57.685624+00	1
1175	103	199710.00	\N	2026-08-18	purchases	230	Purchase of 90 (item FD103)	efa6a255-c2c7-472c-a983-260bb9a59e75	2026-08-19 18:02:38.008242+00	1
1176	105	\N	199710.00	2026-08-18	purchases	230	Payment for purchase of 90 (item FD103)	efa6a255-c2c7-472c-a983-260bb9a59e75	2026-08-19 18:02:38.008573+00	1
1177	103	17000.00	\N	2026-08-19	purchases	231	Purchase of 200 (item FD104)	26f9392f-729f-42dc-8a71-4332f737cabc	2026-08-19 18:04:58.620033+00	1
1178	105	\N	17000.00	2026-08-19	purchases	231	Payment for purchase of 200 (item FD104)	26f9392f-729f-42dc-8a71-4332f737cabc	2026-08-19 18:04:58.620351+00	1
1189	103	20000.00	\N	2026-08-21	purchases	237	Purchase of 10 (item FD101)	e1c5299b-782d-4e52-a76e-6f95dd09a68f	2026-08-21 15:11:34.541668+00	1
1190	105	\N	20000.00	2026-08-21	purchases	237	Payment for purchase of 10 (item FD101)	e1c5299b-782d-4e52-a76e-6f95dd09a68f	2026-08-21 15:11:34.54198+00	1
1191	103	21000.00	\N	2026-08-21	purchases	238	Purchase of 10 (item FD102)	a1d79d88-bab2-4b2a-b0c3-f1507e28b76f	2026-08-21 15:11:34.543796+00	1
1192	105	\N	21000.00	2026-08-21	purchases	238	Payment for purchase of 10 (item FD102)	a1d79d88-bab2-4b2a-b0c3-f1507e28b76f	2026-08-21 15:11:34.544018+00	1
1193	103	22000.00	\N	2026-08-21	purchases	239	Purchase of 10 (item FD103)	e666c2ec-565b-4d5a-abd9-4f6022d25173	2026-08-21 16:08:40.987792+00	1
1194	101	\N	22000.00	2026-08-21	purchases	239	Payment for purchase of 10 (item FD103)	e666c2ec-565b-4d5a-abd9-4f6022d25173	2026-08-21 16:08:40.98869+00	1
1195	110	10000.00	\N	2026-08-31	batch_sales	102	Sale for batch 38	6e9d14ab-656e-4ab9-88de-9d539da64d7d	2026-08-31 05:25:55.688205+00	1
1196	108	\N	10000.00	2026-08-31	batch_sales	102	Revenue from sale for batch 38	6e9d14ab-656e-4ab9-88de-9d539da64d7d	2026-08-31 05:25:55.689196+00	1
1197	104	50000.00	\N	2026-08-31	purchases	240	Purchase of 1000 (item SC101)	00c2f30b-926e-4792-a173-5fca49d02d42	2026-08-31 05:43:47.528962+00	1
1198	105	\N	50000.00	2026-08-31	purchases	240	Payment for purchase of 1000 (item SC101)	00c2f30b-926e-4792-a173-5fca49d02d42	2026-08-31 05:43:47.52978+00	1
1199	104	\N	50000.00	2026-08-31	allocations	177	approve of (requirement 178)	c17b6f3c-281f-488d-9f7c-23c45936e5fa	2026-08-31 05:45:03.804094+00	1
1200	107	50000.00	\N	2026-08-31	allocations	177	Allocation of - Req #178	c17b6f3c-281f-488d-9f7c-23c45936e5fa	2026-08-31 05:45:03.804569+00	1
1201	103	\N	115156.60	2026-08-31	allocations	178	approve of (requirement 179)	7edcecc2-0393-4e7d-be12-e2c529a6541f	2026-08-31 05:47:13.989722+00	1
1202	107	115156.60	\N	2026-08-31	allocations	178	Allocation of - Req #179	7edcecc2-0393-4e7d-be12-e2c529a6541f	2026-08-31 05:47:13.990072+00	1
1203	110	100000.00	\N	2026-08-31	batch_sales	103	Sale for batch 39	0c97041a-0615-4f03-a8fd-37824579bd48	2026-08-31 05:52:36.705894+00	1
1204	108	\N	100000.00	2026-08-31	batch_sales	103	Revenue from sale for batch 39	0c97041a-0615-4f03-a8fd-37824579bd48	2026-08-31 05:52:36.706963+00	1
1207	110	240.00	\N	2026-08-31	batch_sales	107	Sale for batch 39	bfa47f23-282f-4580-a863-1ac4db6b9bae	2026-08-31 23:11:10.280967+00	1
1208	108	\N	240.00	2026-08-31	batch_sales	107	Revenue from sale for batch 39	bfa47f23-282f-4580-a863-1ac4db6b9bae	2026-08-31 23:11:10.674507+00	1
1209	110	1089.00	\N	2026-09-04	batch_sales	108	Sale for batch 39	95a0b021-d602-47a1-abf1-9ae06deb3622	2026-09-04 11:03:15.718552+00	1
1210	108	\N	1089.00	2026-09-04	batch_sales	108	Revenue from sale for batch 39	95a0b021-d602-47a1-abf1-9ae06deb3622	2026-09-04 11:03:15.720939+00	1
1211	103	\N	20492.10	2026-09-04	allocations	179	approve of (requirement 180)	3b77afb4-225c-4f6e-b1a7-d52ec39e4c13	2026-09-04 11:09:40.098133+00	1
1212	107	20492.10	\N	2026-09-04	allocations	179	Allocation of - Req #180	3b77afb4-225c-4f6e-b1a7-d52ec39e4c13	2026-09-04 11:09:40.099584+00	1
1213	110	10000.00	\N	2026-09-04	batch_sales	109	Sale for batch 40	247e1e84-91f0-4a3a-b3ca-1b54ee020917	2026-09-04 11:10:40.39969+00	1
1214	108	\N	10000.00	2026-09-04	batch_sales	109	Revenue from sale for batch 40	247e1e84-91f0-4a3a-b3ca-1b54ee020917	2026-09-04 11:10:40.400422+00	1
1215	110	10100.00	\N	2026-09-04	batch_sales	110	Sale for batch 40	d785d33d-df82-40fd-8252-7828471b582d	2026-09-04 11:11:50.594619+00	1
1216	108	\N	10100.00	2026-09-04	batch_sales	110	Revenue from sale for batch 40	d785d33d-df82-40fd-8252-7828471b582d	2026-09-04 11:11:50.595487+00	1
1217	101	20000.00	\N	2026-09-04	batch_sales	111	Sale for batch 40	cea4366f-e042-4e59-8e1c-b97b58f0b0ea	2026-09-04 11:18:11.416208+00	2
1218	108	\N	20000.00	2026-09-04	batch_sales	111	Revenue from sale for batch 40	cea4366f-e042-4e59-8e1c-b97b58f0b0ea	2026-09-04 11:18:11.417564+00	2
1219	110	100000.00	\N	2026-09-04	batch_sales	112	Sale for batch 40	7eb02881-7825-440c-999a-afe01dec4b15	2026-09-04 11:21:27.790819+00	1
1220	108	\N	100000.00	2026-09-04	batch_sales	112	Revenue from sale for batch 40	7eb02881-7825-440c-999a-afe01dec4b15	2026-09-04 11:21:27.792092+00	1
\.


--
-- Data for Name: loan_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loan_payments (payment_id, loan_id, principal_amount, interest_amount, total_amount, payment_date, payment_mode, reference_number, txn_group_id, notes, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: loans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loans (loan_id, lender_name, principal_amount, interest_rate, loan_date, due_date, outstanding_balance, status, txn_group_id, notes, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (order_id, inquiry_number, trader_id, batch_id, timeslot_id, requested_weight, status, actual_weight, actual_birds, entry_rate, total_amount, rejection_reason, created_at, weight_entered_at, confirmed_at, cancelled_at, rejected_at, expired_at) FROM stdin;
3	INQ-20260803-0001	2	33	4	150.00	CANCELLED_BY_TRADER	\N	\N	\N	\N	\N	2026-08-03 20:39:54.193663+00	\N	\N	2026-08-03 20:40:22.334951+00	\N	\N
5	INQ-20260803-0003	2	33	4	75.00	CONFIRMED	\N	\N	\N	3000.00	\N	2026-08-03 20:43:21.263385+00	\N	2026-08-03 21:07:26.113673+00	\N	\N	\N
4	INQ-20260803-0002	2	33	5	200.00	CONFIRMED	155.00	62	180.00	27900.00	\N	2026-08-03 20:40:01.418541+00	2026-08-03 22:44:27.619168+00	2026-08-03 22:44:38.26239+00	\N	\N	\N
7	INQ-SUP-0001	2	33	4	100.00	REJECTED_BY_SUPERVISOR	\N	\N	\N	\N	Low weight birds	2026-08-03 22:44:58.870068+00	\N	\N	\N	2026-08-03 22:45:19.220933+00	\N
8	INQ-SUP-0002	2	33	4	50.00	CONFIRMED	40.00	10	100.00	4000.00	\N	2026-08-03 22:45:26.005183+00	2026-08-06 11:42:40.465618+00	2026-08-06 11:45:29.638738+00	\N	\N	\N
9	INQ-20260806-0001	2	33	5	150.00	CONFIRMED	150.00	100	200.00	30000.00	\N	2026-08-06 11:48:39.902135+00	2026-08-06 11:51:25.754089+00	2026-08-06 11:58:22.151298+00	\N	\N	\N
11	INQ-20260816-0001	2	33	4	1000.00	REJECTED_BY_SUPERVISOR	\N	\N	\N	\N	Nothing	2026-08-16 18:28:19.558196+00	\N	\N	\N	2026-08-18 07:05:05.063052+00	\N
12	INQ-20260818-0001	2	38	8	200.00	CONFIRMED	200.00	100	100.00	20000.00	\N	2026-08-18 07:06:39.561746+00	2026-08-18 07:07:52.122252+00	2026-08-18 07:10:07.487003+00	\N	\N	\N
10	INQ-20260806-0002	2	35	7	222.00	REJECTED_BY_SUPERVISOR	222.00	100	\N	\N	No	2026-08-06 12:01:54.679975+00	2026-08-06 12:03:46.826396+00	\N	\N	2026-08-18 09:46:36.241488+00	\N
13	INQ-20260818-0002	2	38	8	500.00	CONFIRMED	500.00	250	101.00	50500.00	\N	2026-08-18 09:44:11.487936+00	2026-08-18 09:46:06.660345+00	2026-08-18 09:46:53.200821+00	\N	\N	\N
14	INQ-20260818-0003	2	38	8	1000.00	REJECTED_BY_SUPERVISOR	\N	\N	\N	\N	No	2026-08-18 09:44:30.814912+00	\N	\N	\N	2026-08-31 07:48:08.278221+00	\N
15	INQ-20260904-0001	2	40	10	200.00	CONFIRMED	200.00	100	100.00	20000.00	\N	2026-09-04 11:16:49.115433+00	2026-09-04 11:17:37.510865+00	2026-09-04 11:18:11.412237+00	\N	\N	\N
\.


--
-- Data for Name: other_expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.other_expenses (id, category, amount, description, expense_date, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: post; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post (id, title, text) FROM stdin;
\.


--
-- Data for Name: production_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.production_lines (line_id, line_name, supervisor_id, created_at) FROM stdin;
1	P1	2	2025-09-20 15:02:38.953083+00
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_orders (purchase_order_id, supplier_id, purchase_date, payment_type, created_by, total_cost) FROM stdin;
3	2	2026-08-21	PAYABLE	1	41000.00
4	2	2026-08-21	CASH	1	22000.00
5	6	2026-08-31	PAYABLE	1	50000.00
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchases (purchase_id, item_code, cost_per_unit, total_cost, quantity, purchase_date, created_by, payment_type, supplier_id, purchase_order_id) FROM stdin;
1	SC101	53.92	82497.60	1530.00	2026-03-03	1	PAYABLE	7	\N
2	SC101	54.07	121008.66	2238.00	2026-03-03	1	PAYABLE	7	\N
3	SC101	45.13	159805.33	3541.00	2026-03-03	1	PAYABLE	7	\N
4	SC101	46.07	117478.50	2550.00	2026-03-03	1	PAYABLE	7	\N
5	SC101	50.98	116999.10	2295.00	2026-03-03	1	PAYABLE	7	\N
6	SC101	50.98	176798.64	3468.00	2026-03-03	1	PAYABLE	7	\N
7	SC101	53.92	107246.88	1989.00	2026-03-03	1	PAYABLE	7	\N
8	FD102	1754.55	175455.00	100.00	2026-02-13	1	PAYABLE	11	\N
9	FD101	1912.05	147227.85	77.00	2026-02-13	1	PAYABLE	11	\N
10	FD101	1827.44	228430.00	125.00	2026-03-04	1	PAYABLE	2	\N
11	FD102	1677.36	347213.52	207.00	2026-03-04	1	PAYABLE	2	\N
12	FD102	1827.44	52995.76	29.00	2026-03-04	1	PAYABLE	2	\N
13	SC101	52.94	148496.70	2805.00	2026-03-04	1	PAYABLE	7	\N
14	FD102	1677.36	201283.20	120.00	2026-03-02	1	PAYABLE	2	\N
15	FD101	1877.69	71352.22	38.00	2026-03-04	1	PAYABLE	2	\N
16	FD102	1677.66	3355.32	2.00	2026-03-04	1	PAYABLE	2	\N
17	FD103	1650.56	33011.20	20.00	2026-03-04	1	PAYABLE	2	\N
18	FD104	42.78	7700.00	180.00	2026-03-04	1	PAYABLE	2	\N
19	FD102	1675.00	50250.00	30.00	2026-03-06	1	PAYABLE	4	\N
20	FD103	1595.00	47850.00	30.00	2026-03-06	1	PAYABLE	4	\N
21	FD102	1776.00	355200.00	200.00	2026-03-06	1	PAYABLE	11	\N
25	FD102	1677.36	100641.60	60.00	2026-03-10	1	PAYABLE	2	\N
26	FD104	41.67	2500.00	60.00	2026-03-10	1	PAYABLE	2	\N
27	FD104	75.00	15000.00	200.00	2026-03-11	1	PAYABLE	12	\N
28	FD104	42.50	2550.00	60.00	2026-03-11	1	PAYABLE	12	\N
29	MD101	160.00	1600.00	10.00	2026-03-11	1	PAYABLE	8	\N
30	MD101	150.00	1500.00	10.00	2026-03-12	1	PAYABLE	10	\N
31	FD103	1595.00	95700.00	60.00	2026-03-12	1	PAYABLE	4	\N
32	FD104	41.67	2500.00	60.00	2026-03-12	1	PAYABLE	4	\N
33	SC101	54.12	104499.93	1931.00	2026-03-12	1	PAYABLE	7	\N
34	FD102	1677.36	41934.00	25.00	2026-03-14	1	PAYABLE	2	\N
35	FD103	1650.56	57769.60	35.00	2026-03-14	1	PAYABLE	2	\N
36	FD104	41.67	2500.00	60.00	2026-03-14	1	PAYABLE	2	\N
37	SC101	54.90	173600.00	3162.00	2026-03-14	1	PAYABLE	7	\N
38	SC101	55.93	131100.00	2344.00	2026-03-18	1	PAYABLE	6	\N
39	FD101	1877.69	43186.87	23.00	2026-03-18	1	PAYABLE	2	\N
41	FD103	1650.56	57769.60	35.00	2026-03-18	1	PAYABLE	2	\N
42	FD102	1677.36	3354.72	2.00	2026-03-18	1	PAYABLE	2	\N
45	FD104	41.67	2500.20	60.00	2026-03-19	1	PAYABLE	2	\N
46	FD104	18.33	1100.00	60.00	2026-03-19	1	PAYABLE	11	\N
47	MD101	280.00	5600.00	20.00	2026-03-19	1	PAYABLE	8	\N
48	FD101	1904.49	95224.50	50.00	2026-03-20	1	PAYABLE	2	\N
50	FD102	1804.80	180480.00	100.00	2026-03-20	1	PAYABLE	11	\N
51	FD103	1782.40	178240.00	100.00	2026-03-20	1	PAYABLE	11	\N
52	FD104	50.00	3000.00	60.00	2026-03-20	1	PAYABLE	2	\N
53	FD104	70.00	14000.00	200.00	2026-03-20	1	PAYABLE	11	\N
54	FD102	1704.16	17041.60	10.00	2026-03-20	1	PAYABLE	2	\N
55	SC101	54.90	78400.00	1428.00	2026-03-22	1	PAYABLE	7	\N
56	FD102	1704.17	102250.00	60.00	2026-03-22	1	PAYABLE	2	\N
57	SC101	55.36	106400.00	1922.00	2026-03-26	1	PAYABLE	7	\N
58	SC101	55.13	78400.00	1422.00	2026-03-26	1	PAYABLE	13	\N
59	SC101	55.06	111500.00	2025.00	2026-03-28	1	PAYABLE	13	\N
60	FD101	1904.49	114269.40	60.00	2026-03-28	1	PAYABLE	2	\N
61	FD104	50.00	3000.00	60.00	2026-03-28	1	PAYABLE	2	\N
62	FD102	1704.17	102250.20	60.00	2026-03-30	1	PAYABLE	2	\N
63	FD104	50.00	3000.00	60.00	2026-03-30	1	PAYABLE	2	\N
64	SC101	56.69	210768.00	3718.00	2026-03-27	1	PAYABLE	7	\N
65	FD102	1804.80	61363.20	34.00	2026-03-30	1	PAYABLE	11	\N
66	FD103	1782.40	33865.60	19.00	2026-03-30	1	PAYABLE	11	\N
67	MD101	10.00	2450.00	245.00	2026-03-30	1	PAYABLE	10	\N
68	FD102	1704.17	64758.46	38.00	2026-03-30	1	PAYABLE	11	\N
69	FD102	1704.00	85200.00	50.00	2026-04-01	1	PAYABLE	2	\N
70	FD104	50.00	2500.00	50.00	2026-04-01	1	PAYABLE	12	\N
71	SC101	50.98	114400.00	2244.00	2026-04-02	1	PAYABLE	13	\N
72	FD102	1771.16	106269.60	60.00	2026-04-03	1	PAYABLE	2	\N
73	FD104	50.00	3000.00	60.00	2026-04-03	1	PAYABLE	12	\N
74	FD102	1771.16	106269.60	60.00	2026-04-04	1	PAYABLE	2	\N
75	FD102	50.00	3000.00	60.00	2026-04-04	1	PAYABLE	12	\N
76	FD101	1971.49	39429.80	20.00	2026-04-07	1	PAYABLE	2	\N
77	FD102	1771.16	70846.40	40.00	2026-04-06	1	PAYABLE	2	\N
78	FD104	47.00	2820.00	60.00	2026-04-06	1	PAYABLE	12	\N
79	MD101	295.00	2950.00	10.00	2026-04-08	1	CASH	10	\N
80	FD102	1771.16	106269.60	60.00	2026-04-08	1	PAYABLE	2	\N
81	FD104	41.70	2502.00	60.00	2026-04-09	1	PAYABLE	12	\N
82	FD101	2004.99	120299.40	60.00	2026-04-14	1	PAYABLE	2	\N
83	FD104	41.66	2499.60	60.00	2026-04-14	1	PAYABLE	12	\N
85	FD104	50.00	3000.00	60.00	2026-04-14	1	PAYABLE	12	\N
86	FD102	1804.66	108279.60	60.00	2026-04-14	1	PAYABLE	2	\N
87	FD101	2005.00	34085.00	17.00	2026-04-15	1	PAYABLE	2	\N
88	FD102	1805.00	77615.00	43.00	2026-04-15	1	PAYABLE	2	\N
89	FD104	41.67	2500.00	60.00	2026-04-15	1	PAYABLE	12	\N
90	FD104	41.67	2500.00	60.00	2026-04-15	1	PAYABLE	12	\N
91	FD101	2005.00	20050.00	10.00	2026-04-15	1	PAYABLE	2	\N
92	FD102	1804.66	90233.00	50.00	2026-04-15	1	PAYABLE	2	\N
93	FD102	1804.67	108280.00	60.00	2026-04-16	1	PAYABLE	2	\N
94	FD104	45.00	2700.00	60.00	2026-04-16	1	PAYABLE	12	\N
95	MD101	3000.00	3000.00	1.00	2026-04-20	1	PAYABLE	8	\N
96	SC101	41.24	155400.00	3768.00	2026-04-08	1	PAYABLE	13	\N
97	SC101	53.92	187000.00	3468.00	2026-04-13	1	PAYABLE	13	\N
98	SC101	42.96	118000.00	2747.00	2026-04-09	1	PAYABLE	6	\N
99	FD102	1804.66	108279.60	60.00	2026-04-23	1	PAYABLE	2	\N
100	FD101	2004.99	40099.80	20.00	2026-04-23	1	PAYABLE	2	\N
101	FD102	1804.66	72186.40	40.00	2026-04-23	1	PAYABLE	2	\N
102	FD101	2004.99	30074.85	15.00	2026-04-23	1	PAYABLE	2	\N
103	FD102	1804.66	81209.70	45.00	2026-04-23	1	PAYABLE	2	\N
104	MD101	3500.00	3500.00	1.00	2026-04-24	1	PAYABLE	8	\N
105	MD101	2150.00	2150.00	1.00	2026-04-25	1	PAYABLE	8	\N
106	SC101	41.31	63198.00	1530.00	2026-04-20	1	PAYABLE	13	\N
107	FD102	1841.51	110490.60	60.00	2026-04-25	1	PAYABLE	2	\N
108	FD101	2108.00	59024.00	28.00	2026-04-25	1	PAYABLE	2	\N
109	FD102	1908.00	61056.00	32.00	2026-04-25	1	PAYABLE	2	\N
110	FD104	46.00	11040.00	240.00	2026-04-25	1	PAYABLE	12	\N
111	FD104	50.00	18000.00	360.00	2026-04-29	1	PAYABLE	12	\N
114	FD102	1908.00	114480.00	60.00	2026-04-29	1	PAYABLE	2	\N
116	FD102	1908.00	76320.00	40.00	2026-04-29	1	PAYABLE	2	\N
117	FD101	2108.00	42160.00	20.00	2026-04-29	1	PAYABLE	2	\N
119	FD102	1908.00	114480.00	60.00	2026-04-29	1	PAYABLE	2	\N
118	FD102	1908.00	76320.00	40.00	2026-04-29	1	PAYABLE	2	\N
120	MD101	125.00	1250.00	10.00	2026-04-27	1	PAYABLE	8	\N
121	FD102	1908.00	114480.00	60.00	2026-05-02	1	PAYABLE	2	\N
122	FD102	1908.00	114480.00	60.00	2026-05-06	1	PAYABLE	2	\N
123	FD102	1908.00	114480.00	60.00	2026-05-02	1	PAYABLE	2	\N
124	FD101	2108.84	21088.40	10.00	2026-05-03	1	PAYABLE	2	\N
125	FD102	1908.00	95400.00	50.00	2026-05-03	1	PAYABLE	2	\N
126	FD104	50.00	12000.00	240.00	2026-05-06	1	PAYABLE	12	\N
127	FD101	2108.84	67482.88	32.00	2026-05-07	1	PAYABLE	2	\N
128	FD102	1908.00	53424.00	28.00	2026-05-07	1	PAYABLE	2	\N
130	FD102	1931.96	115917.60	60.00	2026-05-19	1	PAYABLE	2	\N
131	FD102	1931.96	115917.60	60.00	2026-05-09	1	PAYABLE	2	\N
132	FD101	2149.04	10745.20	5.00	2026-05-09	1	PAYABLE	2	\N
133	FD102	1931.96	106257.80	55.00	2026-05-09	1	PAYABLE	2	\N
135	FD102	1931.96	77278.40	40.00	2026-05-10	1	PAYABLE	2	\N
136	FD101	2149.04	10745.20	5.00	2026-05-12	1	PAYABLE	2	\N
137	FD102	1931.96	106257.80	55.00	2026-05-12	1	PAYABLE	2	\N
138	FD101	2149.04	42980.80	20.00	2026-05-14	1	PAYABLE	2	\N
139	FD102	1931.96	77278.40	40.00	2026-05-14	1	PAYABLE	2	\N
140	FD104	50.00	21000.00	420.00	2026-05-14	1	PAYABLE	12	\N
141	FD102	1931.96	115917.60	60.00	2026-05-15	1	PAYABLE	2	\N
143	FD101	2149.04	53726.00	25.00	2026-05-16	1	PAYABLE	2	\N
144	FD102	1931.96	67618.60	35.00	2026-05-16	1	PAYABLE	2	\N
145	FD102	1931.96	115917.60	60.00	2026-05-16	1	PAYABLE	2	\N
146	FD101	2149.04	23639.44	11.00	2026-05-17	1	PAYABLE	2	\N
147	FD102	1931.96	94666.04	49.00	2026-05-17	1	PAYABLE	2	\N
148	FD104	50.00	12000.00	240.00	2026-05-17	1	PAYABLE	12	\N
150	FD102	2022.41	121344.60	60.00	2026-05-25	1	PAYABLE	2	\N
151	FD102	1988.91	119334.60	60.00	2026-05-21	1	PAYABLE	2	\N
152	FD101	2283.04	68491.20	30.00	2026-05-26	1	PAYABLE	2	\N
153	FD102	2022.41	60672.30	30.00	2026-05-26	1	PAYABLE	2	\N
154	FD102	2022.41	121344.60	60.00	2026-05-27	1	PAYABLE	2	\N
155	FD101	2316.54	23165.40	10.00	2026-05-31	1	PAYABLE	2	\N
156	FD102	2049.21	102460.50	50.00	2026-05-31	1	PAYABLE	2	\N
157	FD102	2049.21	122952.60	60.00	2026-06-02	1	PAYABLE	2	\N
158	FD104	50.00	18000.00	360.00	2026-06-02	1	PAYABLE	12	\N
159	FD102	2072.66	124359.60	60.00	2026-06-04	1	PAYABLE	2	\N
160	FD102	2072.66	124359.60	60.00	2026-06-05	1	PAYABLE	2	\N
161	FD101	2350.00	14100.00	6.00	2026-06-07	1	PAYABLE	2	\N
162	FD102	2072.66	111923.64	54.00	2026-06-07	1	PAYABLE	2	\N
163	FD104	47.50	8550.00	180.00	2026-06-08	1	PAYABLE	12	\N
164	FD101	2350.00	9400.00	4.00	2026-06-11	1	PAYABLE	2	\N
165	FD102	2072.66	116068.96	56.00	2026-06-11	1	PAYABLE	2	\N
166	FD101	2369.00	118450.00	50.00	2026-06-13	1	PAYABLE	5	\N
167	FD102	2210.00	331500.00	150.00	2026-06-13	1	PAYABLE	5	\N
168	FD104	42.00	2520.00	60.00	2026-06-11	1	PAYABLE	12	\N
169	FD104	65.00	13000.00	200.00	2026-06-16	1	PAYABLE	12	\N
170	MD101	100.00	1000.00	10.00	2026-04-23	1	PAYABLE	8	\N
171	MD101	100.00	2000.00	20.00	2026-05-01	1	PAYABLE	8	\N
172	MD101	100.00	3500.00	35.00	2026-05-03	1	PAYABLE	8	\N
173	MD101	100.00	2000.00	20.00	2026-05-05	1	PAYABLE	8	\N
174	MD101	100.00	1000.00	10.00	2026-05-08	1	PAYABLE	8	\N
175	MD101	100.00	3500.00	35.00	2026-05-09	1	PAYABLE	8	\N
176	MD101	100.00	1000.00	10.00	2026-05-18	1	PAYABLE	8	\N
177	MD101	100.00	2000.00	20.00	2026-05-18	1	PAYABLE	8	\N
178	MD101	100.00	1500.00	15.00	2026-05-14	1	PAYABLE	8	\N
179	SC101	35.00	61250.00	1750.00	2026-04-26	1	PAYABLE	6	\N
180	SC101	35.29	99000.00	2805.00	2026-04-29	1	PAYABLE	13	\N
181	MD101	100.00	1000.00	10.00	2026-05-28	1	PAYABLE	8	\N
182	FD102	100.00	2000.00	20.00	2026-05-28	1	PAYABLE	8	\N
183	MD101	100.00	2000.00	20.00	2026-05-29	1	PAYABLE	8	\N
184	FD101	2283.04	63925.12	28.00	2026-06-21	1	PAYABLE	2	\N
186	FD102	2099.70	67190.40	32.00	2026-06-21	1	PAYABLE	2	\N
187	FD101	2349.00	30537.00	13.00	2026-06-21	1	PAYABLE	5	\N
188	FD102	2190.00	409530.00	187.00	2026-06-21	1	PAYABLE	5	\N
189	FD104	48.00	4800.00	100.00	2026-06-21	1	PAYABLE	12	\N
190	SC101	53.92	137499.32	2550.00	2026-05-15	1	PAYABLE	6	\N
191	MD101	100.00	2000.00	20.00	2026-04-30	1	PAYABLE	8	\N
192	SC101	35.29	109928.35	3115.00	2026-05-01	1	PAYABLE	13	\N
193	MD101	100.00	1500.00	15.00	2026-05-12	1	PAYABLE	8	\N
194	SC101	29.26	43275.54	1479.00	2026-05-08	1	PAYABLE	13	\N
195	MD101	100.00	1000.00	10.00	2026-06-10	1	PAYABLE	8	\N
213	FD101	2313.00	11565.00	5.00	2026-07-26	1	PAYABLE	2	\N
214	FD102	2139.68	117682.40	55.00	2026-07-26	1	PAYABLE	2	\N
134	FD101	2149.04	42980.80	20.00	2026-05-10	1	PAYABLE	2	\N
196	SC101	31.36	54064.64	1724.00	2026-05-10	1	PAYABLE	7	\N
197	MD101	100.00	5000.00	50.00	2026-06-01	1	PAYABLE	8	\N
199	SC101	30.83	65822.05	2135.00	2026-06-13	1	PAYABLE	13	\N
201	FD102	2067.08	95085.68	46.00	2026-07-04	1	PAYABLE	2	\N
202	FD101	2247.92	31470.88	14.00	2026-07-04	1	PAYABLE	2	\N
204	FD101	2399.00	55177.00	23.00	2026-07-05	1	PAYABLE	5	\N
205	FD102	2240.00	396480.00	177.00	2026-07-05	1	PAYABLE	5	\N
206	FD101	2399.00	119950.00	50.00	2026-07-16	1	PAYABLE	5	\N
207	FD102	2240.00	336000.00	150.00	2026-07-16	1	PAYABLE	5	\N
208	FD104	67.50	13500.00	200.00	2026-07-16	1	PAYABLE	12	\N
209	FD101	2280.92	52461.16	23.00	2026-07-15	1	PAYABLE	2	\N
210	FD102	2106.68	77947.16	37.00	2026-07-15	1	PAYABLE	2	\N
211	FD101	2313.00	34695.00	15.00	2026-07-21	1	PAYABLE	2	\N
212	FD102	2139.68	96285.60	45.00	2026-07-21	1	PAYABLE	2	\N
215	FD101	2355.50	35332.50	15.00	2026-07-30	1	PAYABLE	2	\N
216	FD102	2172.68	97770.60	45.00	2026-07-30	1	PAYABLE	2	\N
217	FD102	2172.68	130360.80	60.00	2026-08-04	1	PAYABLE	2	\N
218	FD101	2434.00	146040.00	60.00	2026-08-02	1	PAYABLE	5	\N
219	FD102	2275.00	318500.00	140.00	2026-08-02	1	PAYABLE	5	\N
220	SC101	50.00	50000.00	1000.00	2026-08-16	1	PAYABLE	13	\N
223	FD102	2172.68	130360.80	60.00	2026-08-09	1	PAYABLE	2	\N
224	FD102	2172.68	43453.60	20.00	2026-08-13	1	PAYABLE	2	\N
225	FD103	2123.18	84927.20	40.00	2026-08-13	1	PAYABLE	2	\N
226	FD103	2123.18	127390.80	60.00	2026-08-17	1	PAYABLE	2	\N
227	FD104	60.00	18000.00	300.00	2026-08-17	1	PAYABLE	12	\N
228	FD101	2464.00	61600.00	25.00	2026-08-18	1	PAYABLE	5	\N
229	FD102	2315.00	196775.00	85.00	2026-08-18	1	PAYABLE	5	\N
230	FD103	2219.00	199710.00	90.00	2026-08-18	1	PAYABLE	5	\N
231	FD104	85.00	17000.00	200.00	2026-08-19	1	PAYABLE	12	\N
237	FD101	2000.00	20000.00	10.00	2026-08-21	1	PAYABLE	2	3
238	FD102	2100.00	21000.00	10.00	2026-08-21	1	PAYABLE	2	3
239	FD103	2200.00	22000.00	10.00	2026-08-21	1	CASH	2	4
240	SC101	50.00	50000.00	1000.00	2026-08-31	1	PAYABLE	6	5
\.


--
-- Data for Name: seaql_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seaql_migrations (version, applied_at) FROM stdin;
m20220101_000001_create_table	1758377191
m20250810_161418_iteration1	1758377205
m20250819_083602_iteration_2	1758377207
m20250819_215006_ledger	1758377212
m20250826_234204_stock_receipts	1758377214
m20250901_223316_farmer_commission	1758377215
m20250906_182108_closed_batches	1758377216
m20250906_211511_batch_sales	1758377218
\.


--
-- Data for Name: stock_receipts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_receipts (lot_id, purchase_id, item_code, received_qty, remaining_qty, unit_cost, received_date, supplier) FROM stdin;
1	1	SC101	1530.00	0.00	53.92	2026-03-03	Singh Poultry (Deepu Singh)
2	2	SC101	2238.00	0.00	54.07	2026-03-03	Singh Poultry (Deepu Singh)
3	3	SC101	3541.00	0.00	45.13	2026-03-03	Singh Poultry (Deepu Singh)
4	4	SC101	2550.00	0.00	46.07	2026-03-03	Singh Poultry (Deepu Singh)
5	5	SC101	2295.00	0.00	50.98	2026-03-03	Singh Poultry (Deepu Singh)
6	6	SC101	3468.00	0.00	50.98	2026-03-03	Singh Poultry (Deepu Singh)
7	7	SC101	1989.00	0.00	53.92	2026-03-03	Singh Poultry (Deepu Singh)
9	9	FD101	77.00	0.00	1912.05	2026-02-13	FELIX ANIMAL SOLUTIONS
8	8	FD102	100.00	0.00	1754.55	2026-02-13	FELIX ANIMAL SOLUTIONS
13	13	SC101	2805.00	0.00	52.94	2026-03-04	Singh Poultry (Deepu Singh)
55	55	SC101	1428.00	0.00	54.90	2026-03-22	Singh Poultry (Deepu Singh)
50	50	FD102	100.00	0.00	1804.80	2026-03-20	FELIX ANIMAL SOLUTIONS
20	20	FD103	30.00	0.00	1595.00	2026-03-06	VK Gold
14	14	FD102	120.00	0.00	1677.36	2026-03-02	Om Shakti
11	11	FD102	207.00	0.00	1677.36	2026-03-04	Om Shakti
12	12	FD102	29.00	0.00	1827.44	2026-03-04	Om Shakti
16	16	FD102	2.00	0.00	1677.66	2026-03-04	Om Shakti
19	19	FD102	30.00	0.00	1675.00	2026-03-06	VK Gold
54	54	FD102	10.00	0.00	1704.16	2026-03-20	Om Shakti
21	21	FD102	200.00	0.00	1776.00	2026-03-06	FELIX ANIMAL SOLUTIONS
56	56	FD102	60.00	0.00	1704.17	2026-03-22	Om Shakti
31	31	FD103	60.00	0.00	1595.00	2026-03-12	VK Gold
71	71	SC101	2244.00	0.00	50.98	2026-04-02	GANGOTRI HATCHERIES
29	29	MD101	10.00	0.00	160.00	2026-03-11	Lal Medico
18	18	FD104	180.00	0.00	42.78	2026-03-04	Om Shakti
95	95	MD101	1.00	0.00	3000.00	2026-04-20	Lal Medico
17	17	FD103	20.00	0.00	1650.56	2026-03-04	Om Shakti
26	26	FD104	60.00	0.00	41.67	2026-03-10	Om Shakti
35	35	FD103	35.00	0.00	1650.56	2026-03-14	Om Shakti
30	30	MD101	10.00	0.00	150.00	2026-03-12	Kushinagar Medical
33	33	SC101	1931.00	0.00	54.12	2026-03-12	Singh Poultry (Deepu Singh)
37	37	SC101	3162.00	0.00	54.90	2026-03-14	Singh Poultry (Deepu Singh)
10	10	FD101	125.00	0.00	1827.44	2026-03-04	Om Shakti
41	41	FD103	35.00	0.00	1650.56	2026-03-18	Om Shakti
38	38	SC101	2344.00	0.00	55.93	2026-03-18	Venky
25	25	FD102	60.00	0.00	1677.36	2026-03-10	Om Shakti
34	34	FD102	25.00	0.00	1677.36	2026-03-14	Om Shakti
42	42	FD102	2.00	0.00	1677.36	2026-03-18	Om Shakti
57	57	SC101	1922.00	0.00	55.36	2026-03-26	Singh Poultry (Deepu Singh)
15	15	FD101	38.00	0.00	1877.69	2026-03-04	Om Shakti
58	58	SC101	1422.00	0.00	55.13	2026-03-26	GANGOTRI HATCHERIES
46	46	FD104	60.00	0.00	18.33	2026-03-19	FELIX ANIMAL SOLUTIONS
62	62	FD102	60.00	0.00	1704.17	2026-03-30	Om Shakti
59	59	SC101	2025.00	0.00	55.06	2026-03-28	GANGOTRI HATCHERIES
52	52	FD104	60.00	0.00	50.00	2026-03-20	Om Shakti
48	48	FD101	50.00	0.00	1904.49	2026-03-20	Om Shakti
64	64	SC101	3718.00	0.00	56.69	2026-03-27	Singh Poultry (Deepu Singh)
47	47	MD101	20.00	0.00	280.00	2026-03-19	Lal Medico
32	32	FD104	60.00	0.00	41.67	2026-03-12	VK Gold
79	79	MD101	10.00	0.00	295.00	2026-04-08	Kushinagar Medical
66	66	FD103	19.00	0.00	1782.40	2026-03-30	FELIX ANIMAL SOLUTIONS
27	27	FD104	200.00	0.00	75.00	2026-03-11	FEED TEMPO
28	28	FD104	60.00	0.00	42.50	2026-03-11	FEED TEMPO
39	39	FD101	23.00	0.00	1877.69	2026-03-18	Om Shakti
65	65	FD102	34.00	0.00	1804.80	2026-03-30	FELIX ANIMAL SOLUTIONS
68	68	FD102	38.00	0.00	1704.17	2026-03-30	FELIX ANIMAL SOLUTIONS
36	36	FD104	60.00	0.00	41.67	2026-03-14	Om Shakti
45	45	FD104	60.00	0.00	41.67	2026-03-19	Om Shakti
67	67	MD101	245.00	0.00	10.00	2026-03-30	Kushinagar Medical
61	61	FD104	60.00	0.00	50.00	2026-03-28	Om Shakti
60	60	FD101	60.00	0.00	1904.49	2026-03-28	Om Shakti
76	76	FD101	20.00	0.00	1971.49	2026-04-07	Om Shakti
86	86	FD102	60.00	0.00	1804.66	2026-04-14	Om Shakti
53	53	FD104	200.00	0.00	70.00	2026-03-20	FELIX ANIMAL SOLUTIONS
74	74	FD102	60.00	0.00	1771.16	2026-04-04	Om Shakti
96	96	SC101	3768.00	0.00	41.24	2026-04-08	GANGOTRI HATCHERIES
97	97	SC101	3468.00	0.00	53.92	2026-04-13	GANGOTRI HATCHERIES
98	98	SC101	2747.00	0.00	42.96	2026-04-09	Venky
69	69	FD102	50.00	0.00	1704.00	2026-04-01	Om Shakti
72	72	FD102	60.00	0.00	1771.16	2026-04-03	Om Shakti
75	75	FD102	60.00	0.00	50.00	2026-04-04	FEED TEMPO
63	63	FD104	60.00	0.00	50.00	2026-03-30	Om Shakti
70	70	FD104	50.00	0.00	50.00	2026-04-01	FEED TEMPO
80	80	FD102	60.00	0.00	1771.16	2026-04-08	Om Shakti
78	78	FD104	60.00	0.00	47.00	2026-04-06	FEED TEMPO
77	77	FD102	40.00	0.00	1771.16	2026-04-06	Om Shakti
83	83	FD104	60.00	0.00	41.66	2026-04-14	FEED TEMPO
81	81	FD104	60.00	0.00	41.70	2026-04-09	FEED TEMPO
90	90	FD104	60.00	0.00	41.67	2026-04-15	FEED TEMPO
89	89	FD104	60.00	0.00	41.67	2026-04-15	FEED TEMPO
85	85	FD104	60.00	0.00	50.00	2026-04-14	FEED TEMPO
82	82	FD101	60.00	0.00	2004.99	2026-04-14	Om Shakti
88	88	FD102	43.00	0.00	1805.00	2026-04-15	Om Shakti
101	101	FD102	40.00	0.00	1804.66	2026-04-23	Om Shakti
92	92	FD102	50.00	0.00	1804.66	2026-04-15	Om Shakti
93	93	FD102	60.00	0.00	1804.67	2026-04-16	Om Shakti
94	94	FD104	60.00	0.00	45.00	2026-04-16	FEED TEMPO
103	103	FD102	45.00	0.00	1804.66	2026-04-23	Om Shakti
87	87	FD101	17.00	0.00	2005.00	2026-04-15	Om Shakti
100	100	FD101	20.00	0.00	2004.99	2026-04-23	Om Shakti
91	91	FD101	10.00	0.00	2005.00	2026-04-15	Om Shakti
102	102	FD101	15.00	0.00	2004.99	2026-04-23	Om Shakti
51	51	FD103	100.00	30.00	1782.40	2026-03-20	FELIX ANIMAL SOLUTIONS
104	104	MD101	1.00	0.00	3500.00	2026-04-24	Lal Medico
73	73	FD104	60.00	0.00	50.00	2026-04-03	FEED TEMPO
105	105	MD101	1.00	0.00	2150.00	2026-04-25	Lal Medico
106	106	SC101	1530.00	0.00	41.31	2026-04-20	GANGOTRI HATCHERIES
120	120	MD101	10.00	0.00	125.00	2026-04-27	Lal Medico
159	159	FD102	60.00	60.00	2072.66	2026-06-04	Om Shakti
160	160	FD102	60.00	60.00	2072.66	2026-06-05	Om Shakti
162	162	FD102	54.00	54.00	2072.66	2026-06-07	Om Shakti
163	163	FD104	180.00	180.00	47.50	2026-06-08	FEED TEMPO
165	165	FD102	56.00	56.00	2072.66	2026-06-11	Om Shakti
166	166	FD101	50.00	50.00	2369.00	2026-06-13	Sampurna
167	167	FD102	150.00	150.00	2210.00	2026-06-13	Sampurna
168	168	FD104	60.00	60.00	42.00	2026-06-11	FEED TEMPO
169	169	FD104	200.00	200.00	65.00	2026-06-16	FEED TEMPO
170	170	MD101	10.00	0.00	100.00	2026-04-23	Lal Medico
171	171	MD101	20.00	0.00	100.00	2026-05-01	Lal Medico
111	111	FD104	360.00	0.00	50.00	2026-04-29	FEED TEMPO
172	172	MD101	35.00	0.00	100.00	2026-05-03	Lal Medico
99	99	FD102	60.00	0.00	1804.66	2026-04-23	Om Shakti
110	110	FD104	240.00	0.00	46.00	2026-04-25	FEED TEMPO
173	173	MD101	20.00	0.00	100.00	2026-05-05	Lal Medico
107	107	FD102	60.00	0.00	1841.51	2026-04-25	Om Shakti
109	109	FD102	32.00	0.00	1908.00	2026-04-25	Om Shakti
175	175	MD101	35.00	0.00	100.00	2026-05-09	Lal Medico
190	190	SC101	2550.00	0.00	53.92	2026-05-15	Venky
174	174	MD101	10.00	0.00	100.00	2026-05-08	Lal Medico
114	114	FD102	60.00	0.00	1908.00	2026-04-29	Om Shakti
116	116	FD102	40.00	0.00	1908.00	2026-04-29	Om Shakti
118	118	FD102	40.00	0.00	1908.00	2026-04-29	Om Shakti
119	119	FD102	60.00	0.00	1908.00	2026-04-29	Om Shakti
194	194	SC101	1479.00	0.00	29.26	2026-05-08	GANGOTRI HATCHERIES
121	121	FD102	60.00	0.00	1908.00	2026-05-02	Om Shakti
181	181	MD101	10.00	0.00	100.00	2026-05-28	Lal Medico
176	176	MD101	10.00	0.00	100.00	2026-05-18	Lal Medico
123	123	FD102	60.00	0.00	1908.00	2026-05-02	Om Shakti
125	125	FD102	50.00	0.00	1908.00	2026-05-03	Om Shakti
122	122	FD102	60.00	0.00	1908.00	2026-05-06	Om Shakti
108	108	FD101	28.00	0.00	2108.00	2026-04-25	Om Shakti
126	126	FD104	240.00	0.00	50.00	2026-05-06	FEED TEMPO
124	124	FD101	10.00	0.00	2108.84	2026-05-03	Om Shakti
177	177	MD101	20.00	0.00	100.00	2026-05-18	Lal Medico
128	128	FD102	28.00	0.00	1908.00	2026-05-07	Om Shakti
141	141	FD102	60.00	0.00	1931.96	2026-05-15	Om Shakti
178	178	MD101	15.00	0.00	100.00	2026-05-14	Lal Medico
144	144	FD102	35.00	0.00	1931.96	2026-05-16	Om Shakti
179	179	SC101	1750.00	0.00	35.00	2026-04-26	Venky
180	180	SC101	2805.00	0.00	35.29	2026-04-29	GANGOTRI HATCHERIES
131	131	FD102	60.00	0.00	1931.96	2026-05-09	Om Shakti
133	133	FD102	55.00	0.00	1931.96	2026-05-09	Om Shakti
135	135	FD102	40.00	0.00	1931.96	2026-05-10	Om Shakti
137	137	FD102	55.00	0.00	1931.96	2026-05-12	Om Shakti
139	139	FD102	40.00	0.00	1931.96	2026-05-14	Om Shakti
145	145	FD102	60.00	0.00	1931.96	2026-05-16	Om Shakti
147	147	FD102	49.00	0.00	1931.96	2026-05-17	Om Shakti
183	183	MD101	20.00	0.00	100.00	2026-05-29	Lal Medico
184	184	FD101	28.00	28.00	2283.04	2026-06-21	Om Shakti
186	186	FD102	32.00	32.00	2099.70	2026-06-21	Om Shakti
187	187	FD101	13.00	13.00	2349.00	2026-06-21	Sampurna
189	189	FD104	100.00	100.00	48.00	2026-06-21	FEED TEMPO
136	136	FD101	5.00	0.00	2149.04	2026-05-12	Om Shakti
140	140	FD104	420.00	0.00	50.00	2026-05-14	FEED TEMPO
151	151	FD102	60.00	0.00	1988.91	2026-05-21	Om Shakti
191	191	MD101	20.00	0.00	100.00	2026-04-30	Lal Medico
192	192	SC101	3115.00	0.00	35.29	2026-05-01	GANGOTRI HATCHERIES
130	130	FD102	60.00	0.00	1931.96	2026-05-19	Om Shakti
127	127	FD101	32.00	0.00	2108.84	2026-05-07	Om Shakti
148	148	FD104	240.00	0.00	50.00	2026-05-17	FEED TEMPO
132	132	FD101	5.00	0.00	2149.04	2026-05-09	Om Shakti
193	193	MD101	15.00	0.00	100.00	2026-05-12	Lal Medico
195	195	MD101	10.00	0.00	100.00	2026-06-10	Lal Medico
182	182	FD102	20.00	0.00	100.00	2026-05-28	Lal Medico
150	150	FD102	60.00	0.00	2022.41	2026-05-25	Om Shakti
117	117	FD101	20.00	0.00	2108.00	2026-04-29	Om Shakti
158	158	FD104	360.00	34.00	50.00	2026-06-02	FEED TEMPO
196	196	SC101	1724.00	0.00	31.36	2026-05-10	Singh Poultry (Deepu Singh)
134	134	FD101	20.00	0.00	2149.04	2026-05-10	Om Shakti
153	153	FD102	30.00	0.00	2022.41	2026-05-26	Om Shakti
201	201	FD102	46.00	46.00	2067.08	2026-07-04	Om Shakti
199	199	SC101	2135.00	0.00	30.83	2026-06-13	GANGOTRI HATCHERIES
138	138	FD101	20.00	0.00	2149.04	2026-05-14	Om Shakti
143	143	FD101	25.00	19.00	2149.04	2026-05-16	Om Shakti
154	154	FD102	60.00	0.00	2022.41	2026-05-27	Om Shakti
156	156	FD102	50.00	19.00	2049.21	2026-05-31	Om Shakti
197	197	MD101	50.00	30.00	100.00	2026-06-01	Lal Medico
202	202	FD101	14.00	14.00	2247.92	2026-07-04	Om Shakti
204	204	FD101	23.00	23.00	2399.00	2026-07-05	Sampurna
205	205	FD102	177.00	177.00	2240.00	2026-07-05	Sampurna
207	207	FD102	150.00	150.00	2240.00	2026-07-16	Sampurna
208	208	FD104	200.00	200.00	67.50	2026-07-16	FEED TEMPO
209	209	FD101	23.00	23.00	2280.92	2026-07-15	Om Shakti
210	210	FD102	37.00	37.00	2106.68	2026-07-15	Om Shakti
211	211	FD101	15.00	15.00	2313.00	2026-07-21	Om Shakti
212	212	FD102	45.00	45.00	2139.68	2026-07-21	Om Shakti
213	213	FD101	5.00	5.00	2313.00	2026-07-26	Om Shakti
188	188	FD102	187.00	177.00	2190.00	2026-06-21	Sampurna
206	206	FD101	50.00	40.00	2399.00	2026-07-16	Sampurna
152	152	FD101	30.00	0.00	2283.04	2026-05-26	Om Shakti
157	157	FD102	60.00	50.00	2049.21	2026-06-02	Om Shakti
214	214	FD102	55.00	55.00	2139.68	2026-07-26	Om Shakti
215	215	FD101	15.00	15.00	2355.50	2026-07-30	Om Shakti
216	216	FD102	45.00	45.00	2172.68	2026-07-30	Om Shakti
217	217	FD102	60.00	60.00	2172.68	2026-08-04	Om Shakti
218	218	FD101	60.00	60.00	2434.00	2026-08-02	Sampurna
219	219	FD102	140.00	140.00	2275.00	2026-08-02	Sampurna
220	220	SC101	1000.00	0.00	50.00	2026-08-16	GANGOTRI HATCHERIES
146	146	FD101	11.00	1.00	2149.04	2026-05-17	Om Shakti
223	223	FD102	60.00	60.00	2172.68	2026-08-09	Om Shakti
224	224	FD102	20.00	20.00	2172.68	2026-08-13	Om Shakti
225	225	FD103	40.00	40.00	2123.18	2026-08-13	Om Shakti
226	226	FD103	60.00	60.00	2123.18	2026-08-17	Om Shakti
227	227	FD104	300.00	300.00	60.00	2026-08-17	FEED TEMPO
228	228	FD101	25.00	25.00	2464.00	2026-08-18	Sampurna
229	229	FD102	85.00	85.00	2315.00	2026-08-18	Sampurna
230	230	FD103	90.00	90.00	2219.00	2026-08-18	Sampurna
231	231	FD104	200.00	200.00	85.00	2026-08-19	FEED TEMPO
237	237	FD101	10.00	10.00	2000.00	2026-08-21	Om Shakti
238	238	FD102	10.00	10.00	2100.00	2026-08-21	Om Shakti
239	239	FD103	10.00	10.00	2200.00	2026-08-21	Om Shakti
240	240	SC101	1000.00	0.00	50.00	2026-08-31	Venky
155	155	FD101	10.00	0.00	2316.54	2026-05-31	Om Shakti
161	161	FD101	6.00	0.00	2350.00	2026-06-07	Om Shakti
164	164	FD101	4.00	0.00	2350.00	2026-06-11	Om Shakti
\.


--
-- Data for Name: stock_returns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_returns (return_id, allocation_line_id, batch_id, return_qty, unit_cost, return_value, return_date, created_at) FROM stdin;
1	18	3	5.00	1827.44	9137.20	2026-03-11	2026-03-11 09:38:58.737831+00
2	36	1	2.00	1827.44	3654.88	2026-03-12	2026-03-12 05:42:02.547314+00
3	35	1	10.00	1776.00	17760.00	2026-03-12	2026-03-12 05:43:36.454788+00
4	68	13	10.00	1877.69	18776.90	2026-03-30	2026-03-30 13:48:01.499281+00
5	87	6	12.00	1782.40	21388.80	2026-04-06	2026-04-06 08:29:37.398162+00
6	86	8	20.00	1782.40	35648.00	2026-04-08	2026-04-08 14:28:40.115826+00
7	159	14	20.00	2004.99	40099.80	2026-06-22	2026-06-22 14:42:17.83886+00
\.


--
-- Data for Name: supplier_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.supplier_payments (payment_id, supplier_id, amount, payment_date, payment_mode, reference_number, notes, created_at, txn_group_id) FROM stdin;
1	2	628639.28	2026-03-04	Bank Transfer	ALL 	PREVIOS	2026-03-04 10:20:39.418412+00	bdd87356-d903-4061-870d-947de11f69a0
2	7	1030331.41	2026-03-04	Bank Transfer	PRE	PRE	2026-03-04 10:21:21.107351+00	a20b7d86-039d-42ca-8f8e-29914c877512
3	11	322682.85	2026-03-04	Bank Transfer	PPR	PRE	2026-03-04 10:21:46.10369+00	b3595847-84bd-4eb5-939d-99f4cf0c30e9
4	2	201283.20	2026-03-02	Bank Transfer	5248970526	1581 & 1582	2026-03-04 10:32:11.780026+00	3db0d698-051c-46df-9150-32ac4a3a0ef9
5	2	115418.74	2026-03-04	Bank Transfer	5249184718	107718+DELIVERY	2026-03-04 12:31:59.787766+00	e3c12a4e-ddcb-46d8-8396-e4f239324ca2
6	4	98100.00	2026-03-06	Bank Transfer	524960863		2026-03-11 13:27:50.947297+00	42af6b9b-8424-4fef-abb8-003f16353da5
7	2	100642.00	2026-03-14	Bank Transfer	5250698662		2026-03-14 08:52:17.49467+00	e3b775dd-a747-4322-b939-50db877328f0
8	2	99703.00	2026-03-14	Bank Transfer	5251085099		2026-03-14 10:14:55.616196+00	05a7b418-d74c-4bf4-9996-c229dc1ebb27
9	2	5000.00	2026-03-14	Bank Transfer		FEED DELIVERY	2026-03-14 10:15:21.681429+00	23545c77-fc8e-46aa-83c0-1dfc876bd9d0
10	4	95700.00	2026-03-12	Bank Transfer	5250692528		2026-03-14 10:17:30.749666+00	bbdeab86-b6f2-480e-9ac9-3f6e77834a90
11	4	2500.00	2026-03-14	Bank Transfer		FEED DELIVERY	2026-03-14 10:17:58.911174+00	337fb6a3-54da-4e39-8643-5577ac4308a2
12	7	278099.93	2026-03-14	Bank Transfer		PREVIOUS 	2026-03-14 10:19:05.244808+00	682c3696-890d-420e-884c-0a6412e3fb84
13	11	322682.85	2026-03-14	Bank Transfer			2026-03-14 10:19:22.671867+00	d947dfbe-07a4-4d28-aaa9-811095d0fa33
14	12	17500.00	2026-03-14	Bank Transfer			2026-03-14 10:19:33.741156+00	bb04df40-e003-4311-910e-a2870c265d5f
15	10	1500.00	2026-03-14	Bank Transfer			2026-03-14 10:19:46.404271+00	08f4ddb7-0b94-4c71-ae96-1791bcdfc222
16	8	1600.00	2026-03-14	Bank Transfer			2026-03-14 10:20:04.386791+00	a7876bcd-454b-47c7-a067-a9984d6c940e
17	11	32517.15	2026-03-14	Bank Transfer			2026-03-14 10:20:44.008268+00	fec4422f-f744-4c76-872e-66f2c5cefc25
18	12	50.00	2026-03-14	Bank Transfer			2026-03-14 10:20:56.658635+00	691074e8-b170-4379-af95-6511d52f3a9e
20	2	324327.69	2026-03-25	Bank Transfer		PRE	2026-03-25 08:05:15.996992+00	064df96d-3224-4b23-a49d-bdb53d3cb835
21	6	131100.00	2026-03-25	Bank Transfer			2026-03-25 08:05:37.125938+00	8ab793c5-b5b4-4b96-93ff-aea89dd0165e
22	7	78400.00	2026-03-25	Bank Transfer			2026-03-25 08:05:50.615315+00	b88289a7-761a-45cf-9951-72a004dc0374
23	11	373820.00	2026-03-25	Bank Transfer			2026-03-25 08:06:04.565495+00	dd5ae940-8d18-4592-bb48-f02688a81fe3
24	13	78400.00	2026-03-26	Bank Transfer	2885	1400	2026-03-26 12:26:32.42126+00	24b07aab-108c-4269-b9b8-e0e037da402b
25	7	106400.00	2026-03-26	Bank Transfer			2026-03-26 12:26:44.762688+00	7b12a99f-2e52-41b0-a21f-35f37c3c9a21
26	8	5600.00	2026-03-26	Bank Transfer			2026-03-26 12:26:54.53891+00	bec24fc7-9f37-4704-96b3-10276523b2fd
27	2	210768.00	2026-03-30	Bank Transfer	5253467924		2026-03-30 14:59:51.912933+00	58227390-9715-43bd-868d-fda998df5bc6
28	2	11751.60	2026-03-30	Bank Transfer	1	FOR DELIVERY	2026-03-30 15:00:16.872652+00	f615b058-3095-4ac8-a6e2-b880dbdbd0ae
29	7	210768.00	2026-03-30	Bank Transfer			2026-03-30 15:00:44.844142+00	e9567049-0ea1-4275-abce-f566e3c524f3
30	10	2450.00	2026-03-30	Bank Transfer			2026-03-30 15:00:55.16374+00	efd202fc-e4da-4b06-b9ea-f6115a1432a6
31	11	159987.26	2026-04-01	Bank Transfer			2026-04-01 07:52:17.307434+00	febd851b-18fd-4876-8416-f620011e9786
32	13	111500.00	2026-04-01	Bank Transfer			2026-04-01 07:52:33.60747+00	27d1b5e2-b3da-4918-9e23-4f213ef7c50e
33	2	85200.00	2026-04-03	Bank Transfer			2026-04-03 08:22:02.706827+00	c11dd509-70ce-4eb2-861c-4bac059252c6
34	13	114400.00	2026-04-02	Bank Transfer	14876		2026-04-03 09:17:49.857527+00	ef55bd85-1057-403d-a444-6b5abb5ce358
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suppliers (supplier_id, supplier_type, name, phone_number, address, bank_account_no, bank_name, ifsc_code, created_at) FROM stdin;
1	feed	Sapan Feed	9005894027	Varanasi-Faizabad	029005006854	ICICI	ICICI0000290	2026-03-02 17:44:22.578712+00
2	feed	Om Shakti	9170306589	Sahjanva Bheti	0183008700012015	PNB	PUNB0018300	2026-03-02 17:47:27.750147+00
3	feed	Om Feed	9120238898	Gorakhpur Bhargadva	000000	PNB	TBA	2026-03-02 17:49:07.731971+00
4	feed	VK Gold	8400700177	Sahjanva Gida	000000	TBA	TBA	2026-03-02 17:50:02.157334+00
5	feed	Sampurna	9335303525	TBA	000000	TBA	TBA	2026-03-02 17:51:07.419397+00
6	chick	Venky	9598364412	TBA	000000	TBA	TBA	2026-03-02 17:52:38.032868+00
7	chick	Singh Poultry (Deepu Singh)	9648951912	Kasya	000000	TBA	TBA	2026-03-02 17:54:06.442116+00
8	medicine	Lal Medico	9415250949	Gorakhpur	000000	TBA	TBA	2026-03-02 17:58:36.786129+00
9	medicine	Asian Pharma	xxxx	Gorakhpur	000000	TBA	TBA	2026-03-02 17:58:51.362036+00
10	medicine	Kushinagar Medical	9839594136	Kushinagar	000000	TBA	TBA	2026-03-02 17:59:32.491095+00
11	feed	FELIX ANIMAL SOLUTIONS	91919919191	TBA	TBA	TBA	TBA	2026-03-04 05:16:28.612962+00
12	feed	FEED TEMPO	99999999	TBA	TBA	TBA	TBA	2026-03-04 12:34:25.822494+00
13	chick	GANGOTRI HATCHERIES	7755050280	GKP	0666008700002885	PNB	PUNB0066600	2026-03-26 12:19:51.515498+00
\.


--
-- Data for Name: timeslots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.timeslots (timeslot_id, batch_id, slot_start, slot_end, created_at) FROM stdin;
4	33	08:00:00	10:00:00	2026-08-03 20:37:34.628392+00
5	33	10:00:00	12:00:00	2026-08-03 20:37:34.628392+00
6	34	09:00:00	10:00:00	2026-08-06 11:30:55.428497+00
7	35	09:00:00	10:00:00	2026-08-06 12:01:39.622507+00
8	38	09:00:00	10:00:00	2026-08-18 07:03:01.112738+00
9	39	09:00:00	10:00:00	2026-08-31 06:12:46.367185+00
10	40	09:00:00	10:00:00	2026-09-04 11:16:35.010258+00
\.


--
-- Data for Name: trader_ledger_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.trader_ledger_entries (id, trader_id, order_id, type, amount, payment_mode, screenshot_url, created_at) FROM stdin;
1	2	\N	payment	3000.00	cash	\N	2026-08-03 21:08:46.125193+00
3	2	\N	payment	40000.00	cash	\N	2026-08-06 13:16:58.286243+00
4	2	\N	payment	41900.00	bank	Whatsapp	2026-08-18 07:11:28.088408+00
10	2	\N	debit	240.00	\N	\N	2026-08-31 23:11:09.567111+00
11	2	\N	debit	1089.00	\N	\N	2026-09-04 11:03:15.713738+00
12	2	\N	debit	10100.00	\N	\N	2026-09-04 11:11:50.591193+00
\.


--
-- Data for Name: trader_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.trader_payments (payment_id, trader_id, amount, payment_date, payment_mode, reference_number, notes, created_at, created_by, txn_group_id) FROM stdin;
1	1	56540.40	2026-03-14	Bank Transfer			2026-03-14 08:47:08.699637+00	\N	ae4cd9f7-5b51-42d9-9b60-4d46dc8b7a30
2	2	250025.30	2026-03-14	Bank Transfer			2026-03-14 08:48:07.801988+00	\N	0334db0f-172d-46d9-8e9f-af8c63e42fd1
3	9	128860.10	2026-03-14	Bank Transfer			2026-03-14 08:48:26.900834+00	\N	61cf4dc5-a785-4260-babe-febb92129662
4	3	219384.00	2026-03-14	Bank Transfer			2026-03-14 08:48:54.889046+00	\N	582c1e0e-7ce6-48cc-93c8-225b626b64e4
5	4	226954.40	2026-03-14	Bank Transfer			2026-03-14 08:49:08.683639+00	\N	b99a7d8d-d41a-4385-9010-c5d5fb1698b8
6	5	62243.20	2026-03-14	Bank Transfer			2026-03-14 08:49:27.967937+00	\N	b2a68c72-5b0f-4d35-99e5-0382952739b7
7	8	110076.25	2026-03-14	Bank Transfer			2026-03-14 08:49:41.604322+00	\N	b5df412d-1ad4-4241-9c3a-b6058dde9c76
8	6	132704.00	2026-03-14	Bank Transfer			2026-03-14 08:49:58.553078+00	\N	e7a628fc-5383-4a12-8c0b-4eb24d9688ea
9	7	17867.20	2026-03-14	Bank Transfer			2026-03-14 08:50:06.867625+00	\N	38c4152a-188f-4c3b-8e49-0a1f797d4ca0
10	10	644.00	2026-03-14	Bank Transfer			2026-03-14 08:50:23.463088+00	\N	84c811dc-e102-486b-bece-866ce3fed544
11	1	40626.00	2026-03-24	Bank Transfer			2026-03-24 13:00:51.180794+00	\N	5aac287b-e266-4ae1-a20b-e29c0d8366b3
12	2	186717.70	2026-03-24	Bank Transfer			2026-03-24 13:01:15.235728+00	\N	ae02294a-ff74-43bb-89d2-e3ebcc63a43b
13	3	169260.10	2026-03-24	Bank Transfer			2026-03-24 13:01:41.75903+00	\N	c0f62ff6-5380-430a-8f2f-825ffd29de89
14	11	31207.00	2026-03-24	Bank Transfer			2026-03-24 13:02:02.604105+00	\N	1b2e3635-1ae3-4916-a789-3b23002baa9a
15	14	203409.00	2026-03-24	Bank Transfer			2026-03-24 13:02:20.130448+00	\N	abbf4b31-b872-40a8-90fc-70272217cf8f
16	13	60285.50	2026-03-24	Bank Transfer			2026-03-24 13:02:34.26864+00	\N	d514f701-9b7f-4952-a473-8f9aa7e1d9b2
17	7	242044.80	2026-03-24	Bank Transfer			2026-03-24 14:31:49.500263+00	\N	c20a65f9-8e64-443c-bb7a-74697968a10c
18	12	98068.50	2026-03-24	Bank Transfer			2026-03-24 14:32:05.185545+00	\N	2df1bf38-524b-43c1-bbd8-f04bce31c36d
19	5	98800.80	2026-03-24	Bank Transfer			2026-03-24 14:32:28.852443+00	\N	4727a601-f2bd-4c7a-a3cf-862eabbb8531
20	4	144371.20	2026-03-24	Bank Transfer			2026-03-24 14:32:44.803906+00	\N	0b007920-3315-49b6-8854-5439c77daade
21	3	116500.00	2026-04-01	Cash		CASH PNB	2026-04-01 07:47:09.417444+00	\N	b3becb3a-c983-4bb1-8f1b-1d81b43f01f9
22	3	27.50	2026-04-01	Bank Transfer		CLEAR	2026-04-01 07:47:35.258665+00	\N	71836c15-bb30-4e20-95cb-cc967af85b10
23	7	68885.00	2026-04-01	Bank Transfer			2026-04-01 07:48:48.277481+00	\N	4e3953b1-80d8-446b-8f74-6e0bcbc13f27
24	10	7602.00	2026-04-01	Bank Transfer			2026-04-01 07:49:07.193771+00	\N	cdfc26b8-fd18-4c2d-a063-8a47a4608349
25	14	93031.15	2026-04-01	Bank Transfer			2026-04-01 07:51:37.930938+00	\N	d2684016-6c94-4fe1-ba94-59b4bfc4f978
26	7	55000.00	2026-04-03	Bank Transfer	5913		2026-04-03 08:20:49.320555+00	\N	b0611081-fdfd-4009-9159-7400924ff655
27	2	47317.00	2026-04-02	Bank Transfer			2026-04-24 07:03:17.432109+00	\N	9eec0ba8-4878-4d98-b330-8ca05443bea4
28	2	100000.00	2026-04-03	Bank Transfer			2026-04-24 07:03:39.812052+00	\N	0459a863-c3d6-4db3-80b8-c07a48d0b4a7
29	15	30000.00	2026-04-05	Bank Transfer			2026-04-25 02:20:57.346203+00	\N	0ddc16b3-b59d-4fcf-8761-264179ad2b93
30	15	1038.00	2026-04-05	Bank Transfer			2026-04-25 02:21:47.049507+00	\N	dc9204a9-9834-4089-ad1f-3c242060c12c
31	15	48973.60	2026-04-19	Bank Transfer			2026-04-25 02:22:11.715066+00	\N	cebf57fd-b86b-45c6-9a8d-2d61168cdca0
\.


--
-- Data for Name: traders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.traders (trader_id, name, phone_number, address, bank_account_no, bank_name, ifsc_code, created_at) FROM stdin;
1	D J SINGH	TBA	TBA	TBA	TBA	TBA	2026-03-10 13:36:05.919187+00
2	SAMIM	1TBA	TBA	TBA	TBA	TBA	2026-03-10 13:50:22.157044+00
3	AMLESH	3TBA	TBA	TBA	TBA	TBA	2026-03-10 13:52:22.093353+00
4	NAUSHAD	4TBA	TBA	TBA	TBA	TBA	2026-03-10 13:53:05.377966+00
5	SINTU	5TBA	TBA	TBA	TBA	TBA	2026-03-10 13:53:16.036952+00
6	AJEET SINGH	6TBA	TBA	TBA	TBA	TBA	2026-03-11 12:09:26.364567+00
7	RANJIT	7TBA	TBA	TBA	TBA	TBA	2026-03-11 12:10:06.087722+00
8	ANIL YADAV	8TBA	TAB	TBA	TBA	TBA	2026-03-12 05:50:32.078362+00
9	MANOJ YADAV	9TBA	TAB	TBA	TBA	TBA	2026-03-12 05:50:45.999345+00
10	SATTA	10TBA	TAB	TBA	TBA	TBA	2026-03-12 05:51:25.372421+00
11	DHANANJAY 	9191991	TBA	TBA	TBA	TBA	2026-03-23 09:43:34.165037+00
12	SANDEEP	7261788168	TBA	TBA	TBA	TBA	2026-03-23 11:31:54.21189+00
13	HARINDRA	1261788168	TBA	TBA	TBA	TBA	2026-03-23 11:34:00.425914+00
15	KRISHNA	66757757	TBA	TBA	TBs	tba	2026-04-20 10:16:15.293134+00
14	NEERAJ	124288168	TBA	TBA	TBA	TBA	2026-03-23 11:35:00.474083+00
16	KHUSHRU	283938193	HDAJSDH	28828	TBA	TBA	2026-04-24 07:05:55.149743+00
17	BABLOO 	818728	TBA	TBA	TBA	TBA	2026-04-25 02:23:55.127899+00
18	MUSKAN	6271621726	TBA	TBA	TBA	TBA	2026-05-13 05:14:00.683741+00
20	KUTTA	277329	N/A	N/A	N/A	DAJD	2026-08-31 05:50:32.652384+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (user_id, name, email, password, role, created_at, phone) FROM stdin;
1	Harshit Singh	singhharshit360@gmail.com	$2a$12$lUhwykbvcex1aDLC43B5b.8MgymZ1q9.1sYlmAhxeSzNMWPd4xPzC	admin	2025-09-20 14:24:33.065401+00	\N
2	ravi	supertester@gmail.com	$2b$12$yRZHLL8GM/ek3Zh4YLnlBexh0uzdtDabpb7zKDMfwwjOrgwAW.Hdy	supervisor	2025-09-20 14:26:36.120598+00	9876500002
\.


--
-- Name: app_supervisors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.app_supervisors_id_seq', 1, false);


--
-- Name: app_traders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.app_traders_id_seq', 4, true);


--
-- Name: audit_log_audit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_log_audit_id_seq', 45, true);


--
-- Name: batch_allocation_lines_allocation_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.batch_allocation_lines_allocation_line_id_seq', 316, true);


--
-- Name: batch_allocations_allocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.batch_allocations_allocation_id_seq', 179, true);


--
-- Name: batch_closure_summary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.batch_closure_summary_id_seq', 30, true);


--
-- Name: batch_requirements_requirement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.batch_requirements_requirement_id_seq', 180, true);


--
-- Name: batch_sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.batch_sales_id_seq', 112, true);


--
-- Name: batches_batch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.batches_batch_id_seq', 40, true);


--
-- Name: bird_count_history_record_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bird_count_history_record_id_seq', 234, true);


--
-- Name: bird_sell_history_sale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bird_sell_history_sale_id_seq', 1, false);


--
-- Name: farmer_commission_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.farmer_commission_history_id_seq', 4, true);


--
-- Name: farmers_farmer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.farmers_farmer_id_seq', 20, true);


--
-- Name: farms_farm_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.farms_farm_id_seq', 5, true);


--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_inventory_id_seq', 7, true);


--
-- Name: inventory_movements_movement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_movements_movement_id_seq', 424, true);


--
-- Name: ledger_accounts_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ledger_accounts_account_id_seq', 112, true);


--
-- Name: ledger_entries_entry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ledger_entries_entry_id_seq', 1220, true);


--
-- Name: loan_payments_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.loan_payments_payment_id_seq', 1, false);


--
-- Name: loans_loan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.loans_loan_id_seq', 1, false);


--
-- Name: orders_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_order_id_seq', 15, true);


--
-- Name: other_expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.other_expenses_id_seq', 1, false);


--
-- Name: post_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.post_id_seq', 1, false);


--
-- Name: production_lines_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.production_lines_line_id_seq', 1, true);


--
-- Name: purchase_orders_purchase_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_orders_purchase_order_id_seq', 5, true);


--
-- Name: purchases_purchase_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchases_purchase_id_seq', 240, true);


--
-- Name: stock_receipts_lot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_receipts_lot_id_seq', 240, true);


--
-- Name: stock_returns_return_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_returns_return_id_seq', 7, true);


--
-- Name: supplier_payments_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.supplier_payments_payment_id_seq', 34, true);


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.suppliers_supplier_id_seq', 13, true);


--
-- Name: timeslots_timeslot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.timeslots_timeslot_id_seq', 10, true);


--
-- Name: trader_ledger_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.trader_ledger_entries_id_seq', 12, true);


--
-- Name: trader_payments_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.trader_payments_payment_id_seq', 31, true);


--
-- Name: traders_trader_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.traders_trader_id_seq', 20, true);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_user_id_seq', 5, true);


--
-- Name: app_supervisors app_supervisors_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_supervisors
    ADD CONSTRAINT app_supervisors_email_key UNIQUE (email);


--
-- Name: app_supervisors app_supervisors_google_sub_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_supervisors
    ADD CONSTRAINT app_supervisors_google_sub_key UNIQUE (google_sub);


--
-- Name: app_supervisors app_supervisors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_supervisors
    ADD CONSTRAINT app_supervisors_pkey PRIMARY KEY (id);


--
-- Name: app_traders app_traders_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_traders
    ADD CONSTRAINT app_traders_email_key UNIQUE (email);


--
-- Name: app_traders app_traders_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_traders
    ADD CONSTRAINT app_traders_phone_key UNIQUE (phone);


--
-- Name: app_traders app_traders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_traders
    ADD CONSTRAINT app_traders_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (audit_id);


--
-- Name: batch_allocation_lines batch_allocation_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_allocation_lines
    ADD CONSTRAINT batch_allocation_lines_pkey PRIMARY KEY (allocation_line_id);


--
-- Name: batch_allocations batch_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_allocations
    ADD CONSTRAINT batch_allocations_pkey PRIMARY KEY (allocation_id);


--
-- Name: batch_closure_summary batch_closure_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_closure_summary
    ADD CONSTRAINT batch_closure_summary_pkey PRIMARY KEY (id);


--
-- Name: batch_requirements batch_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT batch_requirements_pkey PRIMARY KEY (requirement_id);


--
-- Name: batch_sales batch_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT batch_sales_pkey PRIMARY KEY (id);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (batch_id);


--
-- Name: bird_count_history bird_count_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bird_count_history
    ADD CONSTRAINT bird_count_history_pkey PRIMARY KEY (record_id);


--
-- Name: bird_sell_history bird_sell_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bird_sell_history
    ADD CONSTRAINT bird_sell_history_pkey PRIMARY KEY (sale_id);


--
-- Name: farmer_commission_history farmer_commission_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farmer_commission_history
    ADD CONSTRAINT farmer_commission_history_pkey PRIMARY KEY (id);


--
-- Name: farmers farmers_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farmers
    ADD CONSTRAINT farmers_phone_number_key UNIQUE (phone_number);


--
-- Name: farmers farmers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farmers
    ADD CONSTRAINT farmers_pkey PRIMARY KEY (farmer_id);


--
-- Name: farms farms_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_code_key UNIQUE (code);


--
-- Name: farms farms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_pkey PRIMARY KEY (farm_id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (movement_id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (item_code);


--
-- Name: ledger_accounts ledger_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_pkey PRIMARY KEY (account_id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (entry_id);


--
-- Name: loan_payments loan_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_payments
    ADD CONSTRAINT loan_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (loan_id);


--
-- Name: orders orders_inquiry_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_inquiry_number_key UNIQUE (inquiry_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- Name: other_expenses other_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.other_expenses
    ADD CONSTRAINT other_expenses_pkey PRIMARY KEY (id);


--
-- Name: post post_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_pkey PRIMARY KEY (id);


--
-- Name: production_lines production_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lines
    ADD CONSTRAINT production_lines_pkey PRIMARY KEY (line_id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (purchase_order_id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (purchase_id);


--
-- Name: seaql_migrations seaql_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seaql_migrations
    ADD CONSTRAINT seaql_migrations_pkey PRIMARY KEY (version);


--
-- Name: stock_receipts stock_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_pkey PRIMARY KEY (lot_id);


--
-- Name: stock_returns stock_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_returns
    ADD CONSTRAINT stock_returns_pkey PRIMARY KEY (return_id);


--
-- Name: supplier_payments supplier_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: suppliers suppliers_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_phone_number_key UNIQUE (phone_number);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id);


--
-- Name: timeslots timeslots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeslots
    ADD CONSTRAINT timeslots_pkey PRIMARY KEY (timeslot_id);


--
-- Name: trader_ledger_entries trader_ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trader_ledger_entries
    ADD CONSTRAINT trader_ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: trader_payments trader_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trader_payments
    ADD CONSTRAINT trader_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: traders traders_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traders
    ADD CONSTRAINT traders_phone_number_key UNIQUE (phone_number);


--
-- Name: traders traders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traders
    ADD CONSTRAINT traders_pkey PRIMARY KEY (trader_id);


--
-- Name: suppliers uq_suppliers_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT uq_suppliers_name UNIQUE (name);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_batch_allocation_lines_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_allocation_lines_batch_id ON public.batch_allocation_lines USING btree (batch_id);


--
-- Name: idx_ledger_entries_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_entries_account_id ON public.ledger_entries USING btree (account_id);


--
-- Name: idx_ledger_entries_txn_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_entries_txn_group_id ON public.ledger_entries USING btree (txn_group_id);


--
-- Name: idx_loan_payments_loan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_payments_loan_id ON public.loan_payments USING btree (loan_id);


--
-- Name: idx_loans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_status ON public.loans USING btree (status);


--
-- Name: idx_purchase_orders_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders USING btree (supplier_id);


--
-- Name: idx_purchases_purchase_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_purchase_order_id ON public.purchases USING btree (purchase_order_id);


--
-- Name: idx_purchases_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_supplier_id ON public.purchases USING btree (supplier_id);


--
-- Name: idx_stock_returns_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_returns_batch_id ON public.stock_returns USING btree (batch_id);


--
-- Name: idx_supplier_payments_trader_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_payments_trader_id ON public.supplier_payments USING btree (supplier_id);


--
-- Name: idx_trader_ledger_entries_trader_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trader_ledger_entries_trader_id ON public.trader_ledger_entries USING btree (trader_id);


--
-- Name: idx_trader_payments_trader_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trader_payments_trader_id ON public.trader_payments USING btree (trader_id);


--
-- Name: idx_unique_ledger_accounts_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_ledger_accounts_name ON public.ledger_accounts USING btree (name);


--
-- Name: audit_log audit_log_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id);


--
-- Name: batch_closure_summary batch_closure_summary_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_closure_summary
    ADD CONSTRAINT batch_closure_summary_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: batches batches_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(farm_id);


--
-- Name: farmer_commission_history farmer_commission_history_farmer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farmer_commission_history
    ADD CONSTRAINT farmer_commission_history_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmers(farmer_id) ON DELETE CASCADE;


--
-- Name: farms farms_farmer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmers(farmer_id);


--
-- Name: batch_sales fk-batch_sales-batch_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT "fk-batch_sales-batch_id" FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: batch_sales fk-batch_sales-item_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT "fk-batch_sales-item_code" FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON DELETE CASCADE;


--
-- Name: batch_sales fk-batch_sales-trader_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT "fk-batch_sales-trader_id" FOREIGN KEY (trader_id) REFERENCES public.traders(trader_id) ON DELETE CASCADE;


--
-- Name: batch_allocation_lines fk_allocation_lines_allocation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_allocation_lines
    ADD CONSTRAINT fk_allocation_lines_allocation FOREIGN KEY (allocation_id) REFERENCES public.batch_allocations(allocation_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: batch_allocation_lines fk_allocation_lines_lot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_allocation_lines
    ADD CONSTRAINT fk_allocation_lines_lot FOREIGN KEY (lot_id) REFERENCES public.stock_receipts(lot_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: app_traders fk_app_traders_linked_trader_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_traders
    ADD CONSTRAINT fk_app_traders_linked_trader_id FOREIGN KEY (linked_trader_id) REFERENCES public.traders(trader_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: batch_allocation_lines fk_batch_allocation_lines_batch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_allocation_lines
    ADD CONSTRAINT fk_batch_allocation_lines_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: batch_allocations fk_batch_allocations_requirement; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_allocations
    ADD CONSTRAINT fk_batch_allocations_requirement FOREIGN KEY (requirement_id) REFERENCES public.batch_requirements(requirement_id);


--
-- Name: batch_allocations fk_batch_allocations_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_allocations
    ADD CONSTRAINT fk_batch_allocations_user FOREIGN KEY (allocated_by) REFERENCES public.users(user_id);


--
-- Name: batch_requirements fk_batch_requirements_batch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id);


--
-- Name: batch_requirements fk_batch_requirements_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_item FOREIGN KEY (item_code) REFERENCES public.items(item_code);


--
-- Name: batch_requirements fk_batch_requirements_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_line FOREIGN KEY (line_id) REFERENCES public.production_lines(line_id);


--
-- Name: batch_requirements fk_batch_requirements_supervisor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_supervisor FOREIGN KEY (supervisor_id) REFERENCES public.users(user_id);


--
-- Name: batch_sales fk_batch_sales_app_trader_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT fk_batch_sales_app_trader_id FOREIGN KEY (app_trader_id) REFERENCES public.app_traders(id) ON DELETE SET NULL;


--
-- Name: batches fk_batches_farmer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT fk_batches_farmer FOREIGN KEY (farmer_id) REFERENCES public.farmers(farmer_id);


--
-- Name: batches fk_batches_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT fk_batches_line FOREIGN KEY (line_id) REFERENCES public.production_lines(line_id);


--
-- Name: batches fk_batches_supervisor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT fk_batches_supervisor FOREIGN KEY (supervisor_id) REFERENCES public.users(user_id);


--
-- Name: bird_count_history fk_bird_count_history_batch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bird_count_history
    ADD CONSTRAINT fk_bird_count_history_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: bird_sell_history fk_bird_sell_history_batch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bird_sell_history
    ADD CONSTRAINT fk_bird_sell_history_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: bird_sell_history fk_bird_sell_history_trader; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bird_sell_history
    ADD CONSTRAINT fk_bird_sell_history_trader FOREIGN KEY (trader_id) REFERENCES public.traders(trader_id);


--
-- Name: inventory fk_inventory_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT fk_inventory_item FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON DELETE CASCADE;


--
-- Name: inventory_movements fk_inventory_movements_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT fk_inventory_movements_item FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON DELETE CASCADE;


--
-- Name: ledger_entries fk_ledger_entries_account; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT fk_ledger_entries_account FOREIGN KEY (account_id) REFERENCES public.ledger_accounts(account_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ledger_entries fk_ledger_entries_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT fk_ledger_entries_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: production_lines fk_production_lines_supervisor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lines
    ADD CONSTRAINT fk_production_lines_supervisor FOREIGN KEY (supervisor_id) REFERENCES public.users(user_id);


--
-- Name: purchases fk_purchases_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT fk_purchases_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: purchases fk_purchases_item_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT fk_purchases_item_code FOREIGN KEY (item_code) REFERENCES public.items(item_code);


--
-- Name: purchases fk_purchases_purchase_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT fk_purchases_purchase_order FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(purchase_order_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchases fk_purchases_supplier_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT fk_purchases_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: stock_returns fk_returns_allocation_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_returns
    ADD CONSTRAINT fk_returns_allocation_line FOREIGN KEY (allocation_line_id) REFERENCES public.batch_allocation_lines(allocation_line_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_returns fk_returns_batch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_returns
    ADD CONSTRAINT fk_returns_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_receipts fk_stock_receipts_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT fk_stock_receipts_item FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_receipts fk_stock_receipts_purchase; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT fk_stock_receipts_purchase FOREIGN KEY (purchase_id) REFERENCES public.purchases(purchase_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: loan_payments loan_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_payments
    ADD CONSTRAINT loan_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: loan_payments loan_payments_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_payments
    ADD CONSTRAINT loan_payments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(loan_id) ON DELETE RESTRICT;


--
-- Name: loans loans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: orders orders_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id);


--
-- Name: orders orders_timeslot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_timeslot_id_fkey FOREIGN KEY (timeslot_id) REFERENCES public.timeslots(timeslot_id);


--
-- Name: orders orders_trader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_trader_id_fkey FOREIGN KEY (trader_id) REFERENCES public.app_traders(id);


--
-- Name: other_expenses other_expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.other_expenses
    ADD CONSTRAINT other_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: supplier_payments supplier_payments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: timeslots timeslots_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeslots
    ADD CONSTRAINT timeslots_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: trader_ledger_entries trader_ledger_entries_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trader_ledger_entries
    ADD CONSTRAINT trader_ledger_entries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id);


--
-- Name: trader_ledger_entries trader_ledger_entries_trader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trader_ledger_entries
    ADD CONSTRAINT trader_ledger_entries_trader_id_fkey FOREIGN KEY (trader_id) REFERENCES public.app_traders(id);


--
-- Name: trader_payments trader_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trader_payments
    ADD CONSTRAINT trader_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: trader_payments trader_payments_trader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trader_payments
    ADD CONSTRAINT trader_payments_trader_id_fkey FOREIGN KEY (trader_id) REFERENCES public.traders(trader_id);


--
-- PostgreSQL database dump complete
--

\unrestrict nmsa9TtPwrPyCGoPOandse1QWyo1p2AY09fGoixDNAYSImw7pjsQuagr0qh1xPC

