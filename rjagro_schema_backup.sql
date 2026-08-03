--
-- PostgreSQL database dump
--

\restrict mzi23G0afUNrKXLrbRS0EfYXRhgLgEfKH1HtJNaZJ6zic9vhllewXwd1XAjEm0k

-- Dumped from database version 16.11
-- Dumped by pg_dump version 18.3

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: admin
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO admin;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: admin
--

COMMENT ON SCHEMA public IS '';


--
-- Name: batch_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.batch_status AS ENUM (
    'open',
    'closed',
    'live'
);


ALTER TYPE public.batch_status OWNER TO admin;

--
-- Name: item_category; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.item_category AS ENUM (
    'feed',
    'medicine',
    'chicks',
    'finished_birds'
);


ALTER TYPE public.item_category OWNER TO admin;

--
-- Name: ledger_account_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.ledger_account_type AS ENUM (
    'asset',
    'liability',
    'equity',
    'revenue',
    'expense'
);


ALTER TYPE public.ledger_account_type OWNER TO admin;

--
-- Name: loan_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.loan_status AS ENUM (
    'active',
    'closed'
);


ALTER TYPE public.loan_status OWNER TO admin;

--
-- Name: movement_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.movement_type AS ENUM (
    'purchase',
    'allocation',
    'adjustment',
    'transfer'
);


ALTER TYPE public.movement_type OWNER TO admin;

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.order_status AS ENUM (
    'PENDING',
    'WEIGHT_ENTERED',
    'CONFIRMED',
    'CANCELLED_BY_TRADER',
    'REJECTED_BY_SUPERVISOR',
    'EXPIRED'
);


ALTER TYPE public.order_status OWNER TO admin;

--
-- Name: other_expense_category; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.other_expense_category AS ENUM (
    'feed_transfer',
    'loading_unloading',
    'petrol',
    'employee_expenses',
    'misc'
);


ALTER TYPE public.other_expense_category OWNER TO admin;

--
-- Name: payment_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.payment_type AS ENUM (
    'CASH',
    'PAYABLE',
    'RECEIVABLE'
);


ALTER TYPE public.payment_type OWNER TO admin;

--
-- Name: purchase_category; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.purchase_category AS ENUM (
    'bird',
    'feed',
    'medicine'
);


ALTER TYPE public.purchase_category OWNER TO admin;

--
-- Name: requirement_category; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.requirement_category AS ENUM (
    'bird',
    'feed',
    'medicine'
);


ALTER TYPE public.requirement_category OWNER TO admin;

--
-- Name: requirement_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.requirement_status AS ENUM (
    'accept',
    'decline',
    'pending'
);


ALTER TYPE public.requirement_status OWNER TO admin;

--
-- Name: supplier_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.supplier_type AS ENUM (
    'feed',
    'chick',
    'medicine'
);


ALTER TYPE public.supplier_type OWNER TO admin;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'supervisor',
    'accountant',
    'trader'
);


ALTER TYPE public.user_role OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_supervisors; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.app_supervisors (
    id integer NOT NULL,
    google_sub character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(150) NOT NULL,
    phone character varying(15),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.app_supervisors OWNER TO admin;

--
-- Name: app_supervisors_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.app_supervisors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.app_supervisors_id_seq OWNER TO admin;

--
-- Name: app_supervisors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.app_supervisors_id_seq OWNED BY public.app_supervisors.id;


--
-- Name: app_traders; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.app_traders (
    id integer NOT NULL,
    google_sub character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(150) NOT NULL,
    phone character varying(15),
    credit_limit numeric(18,2),
    credit_terms_days integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.app_traders OWNER TO admin;

--
-- Name: app_traders_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.app_traders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.app_traders_id_seq OWNER TO admin;

--
-- Name: app_traders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.app_traders_id_seq OWNED BY public.app_traders.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.audit_log OWNER TO admin;

--
-- Name: audit_log_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.audit_log_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_audit_id_seq OWNER TO admin;

--
-- Name: audit_log_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.audit_log_audit_id_seq OWNED BY public.audit_log.audit_id;


--
-- Name: batch_allocation_lines; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.batch_allocation_lines OWNER TO admin;

--
-- Name: batch_allocation_lines_allocation_line_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.batch_allocation_lines_allocation_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_allocation_lines_allocation_line_id_seq OWNER TO admin;

--
-- Name: batch_allocation_lines_allocation_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.batch_allocation_lines_allocation_line_id_seq OWNED BY public.batch_allocation_lines.allocation_line_id;


--
-- Name: batch_allocations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.batch_allocations (
    allocation_id integer NOT NULL,
    requirement_id integer NOT NULL,
    allocated_qty numeric(12,2) NOT NULL,
    allocated_value numeric(18,2) NOT NULL,
    allocation_date date NOT NULL,
    allocated_by integer NOT NULL
);


ALTER TABLE public.batch_allocations OWNER TO admin;

--
-- Name: batch_allocations_allocation_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.batch_allocations_allocation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_allocations_allocation_id_seq OWNER TO admin;

--
-- Name: batch_allocations_allocation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.batch_allocations_allocation_id_seq OWNED BY public.batch_allocations.allocation_id;


--
-- Name: batch_closure_summary; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.batch_closure_summary OWNER TO admin;

--
-- Name: batch_closure_summary_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.batch_closure_summary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_closure_summary_id_seq OWNER TO admin;

--
-- Name: batch_closure_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.batch_closure_summary_id_seq OWNED BY public.batch_closure_summary.id;


--
-- Name: batch_requirements; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.batch_requirements OWNER TO admin;

--
-- Name: batch_requirements_requirement_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.batch_requirements_requirement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_requirements_requirement_id_seq OWNER TO admin;

--
-- Name: batch_requirements_requirement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.batch_requirements_requirement_id_seq OWNED BY public.batch_requirements.requirement_id;


--
-- Name: batch_sales; Type: TABLE; Schema: public; Owner: admin
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
    sale_date date DEFAULT '2026-01-01'::date NOT NULL
);


ALTER TABLE public.batch_sales OWNER TO admin;

--
-- Name: batch_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.batch_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_sales_id_seq OWNER TO admin;

--
-- Name: batch_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.batch_sales_id_seq OWNED BY public.batch_sales.id;


--
-- Name: batches; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.batches OWNER TO admin;

--
-- Name: batches_batch_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.batches_batch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batches_batch_id_seq OWNER TO admin;

--
-- Name: batches_batch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.batches_batch_id_seq OWNED BY public.batches.batch_id;


--
-- Name: bird_count_history; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.bird_count_history OWNER TO admin;

--
-- Name: bird_count_history_record_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.bird_count_history_record_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bird_count_history_record_id_seq OWNER TO admin;

--
-- Name: bird_count_history_record_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.bird_count_history_record_id_seq OWNED BY public.bird_count_history.record_id;


--
-- Name: bird_sell_history; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.bird_sell_history OWNER TO admin;

--
-- Name: bird_sell_history_sale_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.bird_sell_history_sale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bird_sell_history_sale_id_seq OWNER TO admin;

--
-- Name: bird_sell_history_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.bird_sell_history_sale_id_seq OWNED BY public.bird_sell_history.sale_id;


--
-- Name: farmer_commission_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.farmer_commission_history (
    id integer NOT NULL,
    farmer_id integer NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    description character varying,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.farmer_commission_history OWNER TO admin;

--
-- Name: farmer_commission_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.farmer_commission_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.farmer_commission_history_id_seq OWNER TO admin;

--
-- Name: farmer_commission_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.farmer_commission_history_id_seq OWNED BY public.farmer_commission_history.id;


--
-- Name: farmers; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.farmers OWNER TO admin;

--
-- Name: farmers_farmer_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.farmers_farmer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.farmers_farmer_id_seq OWNER TO admin;

--
-- Name: farmers_farmer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.farmers_farmer_id_seq OWNED BY public.farmers.farmer_id;


--
-- Name: farms; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.farms (
    farm_id integer NOT NULL,
    farmer_id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    latitude numeric(10,7),
    longitude numeric(10,7),
    video_url text,
    maps_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.farms OWNER TO admin;

--
-- Name: farms_farm_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.farms_farm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.farms_farm_id_seq OWNER TO admin;

--
-- Name: farms_farm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.farms_farm_id_seq OWNED BY public.farms.farm_id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.inventory (
    inventory_id integer NOT NULL,
    item_code character varying(100) NOT NULL,
    current_qty numeric(12,2) DEFAULT 0 NOT NULL,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.inventory OWNER TO admin;

--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.inventory_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_inventory_id_seq OWNER TO admin;

--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.inventory_inventory_id_seq OWNED BY public.inventory.inventory_id;


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.inventory_movements (
    movement_id integer NOT NULL,
    item_code character varying(100) NOT NULL,
    qty_change numeric(12,2) NOT NULL,
    movement_type public.movement_type NOT NULL,
    reference_id integer NOT NULL,
    movement_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.inventory_movements OWNER TO admin;

--
-- Name: inventory_movements_movement_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.inventory_movements_movement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_movements_movement_id_seq OWNER TO admin;

--
-- Name: inventory_movements_movement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.inventory_movements_movement_id_seq OWNED BY public.inventory_movements.movement_id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.items (
    item_code character varying(100) NOT NULL,
    item_name character varying(100) NOT NULL,
    item_category public.item_category NOT NULL,
    unit character varying(50) NOT NULL
);


ALTER TABLE public.items OWNER TO admin;

--
-- Name: ledger_accounts; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.ledger_accounts (
    account_id integer NOT NULL,
    name character varying(150) NOT NULL,
    account_type public.ledger_account_type NOT NULL,
    current_balance numeric(18,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ledger_accounts OWNER TO admin;

--
-- Name: ledger_accounts_account_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.ledger_accounts_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ledger_accounts_account_id_seq OWNER TO admin;

--
-- Name: ledger_accounts_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.ledger_accounts_account_id_seq OWNED BY public.ledger_accounts.account_id;


--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.ledger_entries OWNER TO admin;

--
-- Name: ledger_entries_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.ledger_entries_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ledger_entries_entry_id_seq OWNER TO admin;

--
-- Name: ledger_entries_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.ledger_entries_entry_id_seq OWNED BY public.ledger_entries.entry_id;


--
-- Name: loan_payments; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.loan_payments OWNER TO admin;

--
-- Name: loan_payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.loan_payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loan_payments_payment_id_seq OWNER TO admin;

--
-- Name: loan_payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.loan_payments_payment_id_seq OWNED BY public.loan_payments.payment_id;


--
-- Name: loans; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.loans OWNER TO admin;

--
-- Name: loans_loan_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.loans_loan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loans_loan_id_seq OWNER TO admin;

--
-- Name: loans_loan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.loans_loan_id_seq OWNED BY public.loans.loan_id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.orders OWNER TO admin;

--
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.orders_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_order_id_seq OWNER TO admin;

--
-- Name: orders_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.orders_order_id_seq OWNED BY public.orders.order_id;


--
-- Name: other_expenses; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.other_expenses OWNER TO admin;

--
-- Name: other_expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.other_expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.other_expenses_id_seq OWNER TO admin;

--
-- Name: other_expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.other_expenses_id_seq OWNED BY public.other_expenses.id;


--
-- Name: post; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.post (
    id integer NOT NULL,
    title character varying NOT NULL,
    text character varying NOT NULL
);


ALTER TABLE public.post OWNER TO admin;

--
-- Name: post_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.post_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.post_id_seq OWNER TO admin;

--
-- Name: post_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.post_id_seq OWNED BY public.post.id;


--
-- Name: production_lines; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.production_lines (
    line_id integer NOT NULL,
    line_name character varying(100) NOT NULL,
    supervisor_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.production_lines OWNER TO admin;

--
-- Name: production_lines_line_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.production_lines_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.production_lines_line_id_seq OWNER TO admin;

--
-- Name: production_lines_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.production_lines_line_id_seq OWNED BY public.production_lines.line_id;


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: admin
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
    supplier_id integer NOT NULL
);


ALTER TABLE public.purchases OWNER TO admin;

--
-- Name: purchases_purchase_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.purchases_purchase_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchases_purchase_id_seq OWNER TO admin;

--
-- Name: purchases_purchase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.purchases_purchase_id_seq OWNED BY public.purchases.purchase_id;


--
-- Name: seaql_migrations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.seaql_migrations (
    version character varying NOT NULL,
    applied_at bigint NOT NULL
);


ALTER TABLE public.seaql_migrations OWNER TO admin;

--
-- Name: stock_receipts; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.stock_receipts OWNER TO admin;

--
-- Name: stock_receipts_lot_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.stock_receipts_lot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_receipts_lot_id_seq OWNER TO admin;

--
-- Name: stock_receipts_lot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.stock_receipts_lot_id_seq OWNED BY public.stock_receipts.lot_id;


--
-- Name: stock_returns; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.stock_returns OWNER TO admin;

--
-- Name: stock_returns_return_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.stock_returns_return_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_returns_return_id_seq OWNER TO admin;

--
-- Name: stock_returns_return_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.stock_returns_return_id_seq OWNED BY public.stock_returns.return_id;


--
-- Name: supplier_payments; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.supplier_payments OWNER TO admin;

--
-- Name: supplier_payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.supplier_payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_payments_payment_id_seq OWNER TO admin;

--
-- Name: supplier_payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.supplier_payments_payment_id_seq OWNED BY public.supplier_payments.payment_id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.suppliers OWNER TO admin;

--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.suppliers_supplier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_supplier_id_seq OWNER TO admin;

--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.suppliers_supplier_id_seq OWNED BY public.suppliers.supplier_id;


--
-- Name: timeslots; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.timeslots (
    timeslot_id integer NOT NULL,
    batch_id integer NOT NULL,
    slot_start time without time zone NOT NULL,
    slot_end time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.timeslots OWNER TO admin;

--
-- Name: timeslots_timeslot_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.timeslots_timeslot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timeslots_timeslot_id_seq OWNER TO admin;

--
-- Name: timeslots_timeslot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.timeslots_timeslot_id_seq OWNED BY public.timeslots.timeslot_id;


--
-- Name: trader_payments; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.trader_payments OWNER TO admin;

--
-- Name: trader_payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.trader_payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trader_payments_payment_id_seq OWNER TO admin;

--
-- Name: trader_payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.trader_payments_payment_id_seq OWNED BY public.trader_payments.payment_id;


--
-- Name: traders; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.traders OWNER TO admin;

--
-- Name: traders_trader_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.traders_trader_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.traders_trader_id_seq OWNER TO admin;

--
-- Name: traders_trader_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.traders_trader_id_seq OWNED BY public.traders.trader_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    role public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO admin;

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO admin;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: app_supervisors id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.app_supervisors ALTER COLUMN id SET DEFAULT nextval('public.app_supervisors_id_seq'::regclass);


--
-- Name: app_traders id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.app_traders ALTER COLUMN id SET DEFAULT nextval('public.app_traders_id_seq'::regclass);


--
-- Name: audit_log audit_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN audit_id SET DEFAULT nextval('public.audit_log_audit_id_seq'::regclass);


--
-- Name: batch_allocation_lines allocation_line_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_allocation_lines ALTER COLUMN allocation_line_id SET DEFAULT nextval('public.batch_allocation_lines_allocation_line_id_seq'::regclass);


--
-- Name: batch_allocations allocation_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_allocations ALTER COLUMN allocation_id SET DEFAULT nextval('public.batch_allocations_allocation_id_seq'::regclass);


--
-- Name: batch_closure_summary id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_closure_summary ALTER COLUMN id SET DEFAULT nextval('public.batch_closure_summary_id_seq'::regclass);


--
-- Name: batch_requirements requirement_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_requirements ALTER COLUMN requirement_id SET DEFAULT nextval('public.batch_requirements_requirement_id_seq'::regclass);


--
-- Name: batch_sales id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_sales ALTER COLUMN id SET DEFAULT nextval('public.batch_sales_id_seq'::regclass);


--
-- Name: batches batch_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batches ALTER COLUMN batch_id SET DEFAULT nextval('public.batches_batch_id_seq'::regclass);


--
-- Name: bird_count_history record_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.bird_count_history ALTER COLUMN record_id SET DEFAULT nextval('public.bird_count_history_record_id_seq'::regclass);


--
-- Name: bird_sell_history sale_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.bird_sell_history ALTER COLUMN sale_id SET DEFAULT nextval('public.bird_sell_history_sale_id_seq'::regclass);


--
-- Name: farmer_commission_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.farmer_commission_history ALTER COLUMN id SET DEFAULT nextval('public.farmer_commission_history_id_seq'::regclass);


--
-- Name: farmers farmer_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.farmers ALTER COLUMN farmer_id SET DEFAULT nextval('public.farmers_farmer_id_seq'::regclass);


--
-- Name: farms farm_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.farms ALTER COLUMN farm_id SET DEFAULT nextval('public.farms_farm_id_seq'::regclass);


--
-- Name: inventory inventory_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory ALTER COLUMN inventory_id SET DEFAULT nextval('public.inventory_inventory_id_seq'::regclass);


--
-- Name: inventory_movements movement_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory_movements ALTER COLUMN movement_id SET DEFAULT nextval('public.inventory_movements_movement_id_seq'::regclass);


--
-- Name: ledger_accounts account_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ledger_accounts ALTER COLUMN account_id SET DEFAULT nextval('public.ledger_accounts_account_id_seq'::regclass);


--
-- Name: ledger_entries entry_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ledger_entries ALTER COLUMN entry_id SET DEFAULT nextval('public.ledger_entries_entry_id_seq'::regclass);


--
-- Name: loan_payments payment_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.loan_payments ALTER COLUMN payment_id SET DEFAULT nextval('public.loan_payments_payment_id_seq'::regclass);


--
-- Name: loans loan_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.loans ALTER COLUMN loan_id SET DEFAULT nextval('public.loans_loan_id_seq'::regclass);


--
-- Name: orders order_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders ALTER COLUMN order_id SET DEFAULT nextval('public.orders_order_id_seq'::regclass);


--
-- Name: other_expenses id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.other_expenses ALTER COLUMN id SET DEFAULT nextval('public.other_expenses_id_seq'::regclass);


--
-- Name: post id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.post ALTER COLUMN id SET DEFAULT nextval('public.post_id_seq'::regclass);


--
-- Name: production_lines line_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.production_lines ALTER COLUMN line_id SET DEFAULT nextval('public.production_lines_line_id_seq'::regclass);


--
-- Name: purchases purchase_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchases ALTER COLUMN purchase_id SET DEFAULT nextval('public.purchases_purchase_id_seq'::regclass);


--
-- Name: stock_receipts lot_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_receipts ALTER COLUMN lot_id SET DEFAULT nextval('public.stock_receipts_lot_id_seq'::regclass);


--
-- Name: stock_returns return_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_returns ALTER COLUMN return_id SET DEFAULT nextval('public.stock_returns_return_id_seq'::regclass);


--
-- Name: supplier_payments payment_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.supplier_payments ALTER COLUMN payment_id SET DEFAULT nextval('public.supplier_payments_payment_id_seq'::regclass);


--
-- Name: suppliers supplier_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN supplier_id SET DEFAULT nextval('public.suppliers_supplier_id_seq'::regclass);


--
-- Name: timeslots timeslot_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.timeslots ALTER COLUMN timeslot_id SET DEFAULT nextval('public.timeslots_timeslot_id_seq'::regclass);


--
-- Name: trader_payments payment_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.trader_payments ALTER COLUMN payment_id SET DEFAULT nextval('public.trader_payments_payment_id_seq'::regclass);


--
-- Name: traders trader_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.traders ALTER COLUMN trader_id SET DEFAULT nextval('public.traders_trader_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: app_supervisors app_supervisors_email_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.app_supervisors
    ADD CONSTRAINT app_supervisors_email_key UNIQUE (email);


--
-- Name: app_supervisors app_supervisors_google_sub_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.app_supervisors
    ADD CONSTRAINT app_supervisors_google_sub_key UNIQUE (google_sub);


--
-- Name: app_supervisors app_supervisors_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.app_supervisors
    ADD CONSTRAINT app_supervisors_pkey PRIMARY KEY (id);


--
-- Name: app_traders app_traders_email_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.app_traders
    ADD CONSTRAINT app_traders_email_key UNIQUE (email);


--
-- Name: app_traders app_traders_google_sub_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.app_traders
    ADD CONSTRAINT app_traders_google_sub_key UNIQUE (google_sub);


--
-- Name: app_traders app_traders_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.app_traders
    ADD CONSTRAINT app_traders_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (audit_id);


--
-- Name: batch_allocation_lines batch_allocation_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_allocation_lines
    ADD CONSTRAINT batch_allocation_lines_pkey PRIMARY KEY (allocation_line_id);


--
-- Name: batch_allocations batch_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_allocations
    ADD CONSTRAINT batch_allocations_pkey PRIMARY KEY (allocation_id);


--
-- Name: batch_closure_summary batch_closure_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_closure_summary
    ADD CONSTRAINT batch_closure_summary_pkey PRIMARY KEY (id);


--
-- Name: batch_requirements batch_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT batch_requirements_pkey PRIMARY KEY (requirement_id);


--
-- Name: batch_sales batch_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT batch_sales_pkey PRIMARY KEY (id);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (batch_id);


--
-- Name: bird_count_history bird_count_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.bird_count_history
    ADD CONSTRAINT bird_count_history_pkey PRIMARY KEY (record_id);


--
-- Name: bird_sell_history bird_sell_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.bird_sell_history
    ADD CONSTRAINT bird_sell_history_pkey PRIMARY KEY (sale_id);


--
-- Name: farmer_commission_history farmer_commission_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.farmer_commission_history
    ADD CONSTRAINT farmer_commission_history_pkey PRIMARY KEY (id);


--
-- Name: farmers farmers_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.farmers
    ADD CONSTRAINT farmers_phone_number_key UNIQUE (phone_number);


--
-- Name: farmers farmers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.farmers
    ADD CONSTRAINT farmers_pkey PRIMARY KEY (farmer_id);


--
-- Name: farms farms_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_code_key UNIQUE (code);


--
-- Name: farms farms_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_pkey PRIMARY KEY (farm_id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (movement_id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (item_code);


--
-- Name: ledger_accounts ledger_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_pkey PRIMARY KEY (account_id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (entry_id);


--
-- Name: loan_payments loan_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.loan_payments
    ADD CONSTRAINT loan_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (loan_id);


--
-- Name: orders orders_inquiry_number_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_inquiry_number_key UNIQUE (inquiry_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- Name: other_expenses other_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.other_expenses
    ADD CONSTRAINT other_expenses_pkey PRIMARY KEY (id);


--
-- Name: post post_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_pkey PRIMARY KEY (id);


--
-- Name: production_lines production_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.production_lines
    ADD CONSTRAINT production_lines_pkey PRIMARY KEY (line_id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (purchase_id);


--
-- Name: seaql_migrations seaql_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.seaql_migrations
    ADD CONSTRAINT seaql_migrations_pkey PRIMARY KEY (version);


--
-- Name: stock_receipts stock_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_pkey PRIMARY KEY (lot_id);


--
-- Name: stock_returns stock_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_returns
    ADD CONSTRAINT stock_returns_pkey PRIMARY KEY (return_id);


--
-- Name: supplier_payments supplier_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: suppliers suppliers_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_phone_number_key UNIQUE (phone_number);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id);


--
-- Name: timeslots timeslots_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.timeslots
    ADD CONSTRAINT timeslots_pkey PRIMARY KEY (timeslot_id);


--
-- Name: trader_payments trader_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.trader_payments
    ADD CONSTRAINT trader_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: traders traders_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.traders
    ADD CONSTRAINT traders_phone_number_key UNIQUE (phone_number);


--
-- Name: traders traders_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.traders
    ADD CONSTRAINT traders_pkey PRIMARY KEY (trader_id);


--
-- Name: suppliers uq_suppliers_name; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT uq_suppliers_name UNIQUE (name);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_batch_allocation_lines_batch_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_batch_allocation_lines_batch_id ON public.batch_allocation_lines USING btree (batch_id);


--
-- Name: idx_ledger_entries_account_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_ledger_entries_account_id ON public.ledger_entries USING btree (account_id);


--
-- Name: idx_ledger_entries_txn_group_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_ledger_entries_txn_group_id ON public.ledger_entries USING btree (txn_group_id);


--
-- Name: idx_loan_payments_loan_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_loan_payments_loan_id ON public.loan_payments USING btree (loan_id);


--
-- Name: idx_loans_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_loans_status ON public.loans USING btree (status);


--
-- Name: idx_purchases_supplier_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_purchases_supplier_id ON public.purchases USING btree (supplier_id);


--
-- Name: idx_stock_returns_batch_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stock_returns_batch_id ON public.stock_returns USING btree (batch_id);


--
-- Name: idx_supplier_payments_trader_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_supplier_payments_trader_id ON public.supplier_payments USING btree (supplier_id);


--
-- Name: idx_trader_payments_trader_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_trader_payments_trader_id ON public.trader_payments USING btree (trader_id);


--
-- Name: idx_unique_ledger_accounts_name; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX idx_unique_ledger_accounts_name ON public.ledger_accounts USING btree (name);


--
-- Name: audit_log audit_log_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id);


--
-- Name: batch_closure_summary batch_closure_summary_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_closure_summary
    ADD CONSTRAINT batch_closure_summary_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: batches batches_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(farm_id);


--
-- Name: farmer_commission_history farmer_commission_history_farmer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.farmer_commission_history
    ADD CONSTRAINT farmer_commission_history_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmers(farmer_id) ON DELETE CASCADE;


--
-- Name: farms farms_farmer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmers(farmer_id);


--
-- Name: batch_sales fk-batch_sales-batch_id; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT "fk-batch_sales-batch_id" FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: batch_sales fk-batch_sales-item_code; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT "fk-batch_sales-item_code" FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON DELETE CASCADE;


--
-- Name: batch_sales fk-batch_sales-trader_id; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT "fk-batch_sales-trader_id" FOREIGN KEY (trader_id) REFERENCES public.traders(trader_id) ON DELETE CASCADE;


--
-- Name: batch_allocation_lines fk_allocation_lines_allocation; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_allocation_lines
    ADD CONSTRAINT fk_allocation_lines_allocation FOREIGN KEY (allocation_id) REFERENCES public.batch_allocations(allocation_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: batch_allocation_lines fk_allocation_lines_lot; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_allocation_lines
    ADD CONSTRAINT fk_allocation_lines_lot FOREIGN KEY (lot_id) REFERENCES public.stock_receipts(lot_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: batch_allocation_lines fk_batch_allocation_lines_batch; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_allocation_lines
    ADD CONSTRAINT fk_batch_allocation_lines_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: batch_allocations fk_batch_allocations_requirement; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_allocations
    ADD CONSTRAINT fk_batch_allocations_requirement FOREIGN KEY (requirement_id) REFERENCES public.batch_requirements(requirement_id);


--
-- Name: batch_allocations fk_batch_allocations_user; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_allocations
    ADD CONSTRAINT fk_batch_allocations_user FOREIGN KEY (allocated_by) REFERENCES public.users(user_id);


--
-- Name: batch_requirements fk_batch_requirements_batch; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id);


--
-- Name: batch_requirements fk_batch_requirements_item; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_item FOREIGN KEY (item_code) REFERENCES public.items(item_code);


--
-- Name: batch_requirements fk_batch_requirements_line; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_line FOREIGN KEY (line_id) REFERENCES public.production_lines(line_id);


--
-- Name: batch_requirements fk_batch_requirements_supervisor; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_supervisor FOREIGN KEY (supervisor_id) REFERENCES public.users(user_id);


--
-- Name: batches fk_batches_farmer; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT fk_batches_farmer FOREIGN KEY (farmer_id) REFERENCES public.farmers(farmer_id);


--
-- Name: batches fk_batches_line; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT fk_batches_line FOREIGN KEY (line_id) REFERENCES public.production_lines(line_id);


--
-- Name: batches fk_batches_supervisor; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT fk_batches_supervisor FOREIGN KEY (supervisor_id) REFERENCES public.users(user_id);


--
-- Name: bird_count_history fk_bird_count_history_batch; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.bird_count_history
    ADD CONSTRAINT fk_bird_count_history_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: bird_sell_history fk_bird_sell_history_batch; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.bird_sell_history
    ADD CONSTRAINT fk_bird_sell_history_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: bird_sell_history fk_bird_sell_history_trader; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.bird_sell_history
    ADD CONSTRAINT fk_bird_sell_history_trader FOREIGN KEY (trader_id) REFERENCES public.traders(trader_id);


--
-- Name: inventory fk_inventory_item; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT fk_inventory_item FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON DELETE CASCADE;


--
-- Name: inventory_movements fk_inventory_movements_item; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT fk_inventory_movements_item FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON DELETE CASCADE;


--
-- Name: ledger_entries fk_ledger_entries_account; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT fk_ledger_entries_account FOREIGN KEY (account_id) REFERENCES public.ledger_accounts(account_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ledger_entries fk_ledger_entries_created_by; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT fk_ledger_entries_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: production_lines fk_production_lines_supervisor; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.production_lines
    ADD CONSTRAINT fk_production_lines_supervisor FOREIGN KEY (supervisor_id) REFERENCES public.users(user_id);


--
-- Name: purchases fk_purchases_created_by; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT fk_purchases_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: purchases fk_purchases_item_code; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT fk_purchases_item_code FOREIGN KEY (item_code) REFERENCES public.items(item_code);


--
-- Name: purchases fk_purchases_supplier_id; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT fk_purchases_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: stock_returns fk_returns_allocation_line; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_returns
    ADD CONSTRAINT fk_returns_allocation_line FOREIGN KEY (allocation_line_id) REFERENCES public.batch_allocation_lines(allocation_line_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_returns fk_returns_batch; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_returns
    ADD CONSTRAINT fk_returns_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_receipts fk_stock_receipts_item; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT fk_stock_receipts_item FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_receipts fk_stock_receipts_purchase; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT fk_stock_receipts_purchase FOREIGN KEY (purchase_id) REFERENCES public.purchases(purchase_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: loan_payments loan_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.loan_payments
    ADD CONSTRAINT loan_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: loan_payments loan_payments_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.loan_payments
    ADD CONSTRAINT loan_payments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(loan_id) ON DELETE RESTRICT;


--
-- Name: loans loans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: orders orders_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id);


--
-- Name: orders orders_timeslot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_timeslot_id_fkey FOREIGN KEY (timeslot_id) REFERENCES public.timeslots(timeslot_id);


--
-- Name: orders orders_trader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_trader_id_fkey FOREIGN KEY (trader_id) REFERENCES public.app_traders(id);


--
-- Name: other_expenses other_expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.other_expenses
    ADD CONSTRAINT other_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: supplier_payments supplier_payments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: timeslots timeslots_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.timeslots
    ADD CONSTRAINT timeslots_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: trader_payments trader_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.trader_payments
    ADD CONSTRAINT trader_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: trader_payments trader_payments_trader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.trader_payments
    ADD CONSTRAINT trader_payments_trader_id_fkey FOREIGN KEY (trader_id) REFERENCES public.traders(trader_id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: admin
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict mzi23G0afUNrKXLrbRS0EfYXRhgLgEfKH1HtJNaZJ6zic9vhllewXwd1XAjEm0k

