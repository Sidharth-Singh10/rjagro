--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (63f4182)
-- Dumped by pg_dump version 17.5

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
-- Name: batch_status; Type: TYPE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TYPE public.batch_status AS ENUM (
    'open',
    'closed'
);


ALTER TYPE public.batch_status OWNER TO "soundscoreDB_owner";

--
-- Name: item_category; Type: TYPE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TYPE public.item_category AS ENUM (
    'feed',
    'medicine',
    'chicks',
    'finished_birds'
);


ALTER TYPE public.item_category OWNER TO "soundscoreDB_owner";

--
-- Name: ledger_account_type; Type: TYPE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TYPE public.ledger_account_type AS ENUM (
    'asset',
    'liability',
    'equity',
    'revenue',
    'expense'
);


ALTER TYPE public.ledger_account_type OWNER TO "soundscoreDB_owner";

--
-- Name: movement_type; Type: TYPE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TYPE public.movement_type AS ENUM (
    'purchase',
    'allocation',
    'adjustment',
    'transfer'
);


ALTER TYPE public.movement_type OWNER TO "soundscoreDB_owner";

--
-- Name: purchase_category; Type: TYPE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TYPE public.purchase_category AS ENUM (
    'bird',
    'feed',
    'medicine'
);


ALTER TYPE public.purchase_category OWNER TO "soundscoreDB_owner";

--
-- Name: requirement_category; Type: TYPE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TYPE public.requirement_category AS ENUM (
    'bird',
    'feed',
    'medicine'
);


ALTER TYPE public.requirement_category OWNER TO "soundscoreDB_owner";

--
-- Name: requirement_status; Type: TYPE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TYPE public.requirement_status AS ENUM (
    'accept',
    'decline',
    'pending'
);


ALTER TYPE public.requirement_status OWNER TO "soundscoreDB_owner";

--
-- Name: supplier_type; Type: TYPE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TYPE public.supplier_type AS ENUM (
    'feed',
    'chick',
    'medicine'
);


ALTER TYPE public.supplier_type OWNER TO "soundscoreDB_owner";

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'supervisor',
    'accountant'
);


ALTER TYPE public.user_role OWNER TO "soundscoreDB_owner";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: batch_allocation_lines; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.batch_allocation_lines (
    allocation_line_id integer NOT NULL,
    allocation_id integer NOT NULL,
    lot_id integer NOT NULL,
    qty numeric(12,2) NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    line_value numeric(12,2) NOT NULL
);


ALTER TABLE public.batch_allocation_lines OWNER TO "soundscoreDB_owner";

--
-- Name: batch_allocation_lines_allocation_line_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.batch_allocation_lines_allocation_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_allocation_lines_allocation_line_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: batch_allocation_lines_allocation_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.batch_allocation_lines_allocation_line_id_seq OWNED BY public.batch_allocation_lines.allocation_line_id;


--
-- Name: batch_allocations; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.batch_allocations (
    allocation_id integer NOT NULL,
    requirement_id integer NOT NULL,
    allocated_qty numeric(12,2) NOT NULL,
    allocated_value numeric(18,2) NOT NULL,
    allocation_date date NOT NULL,
    allocated_by integer NOT NULL
);


ALTER TABLE public.batch_allocations OWNER TO "soundscoreDB_owner";

--
-- Name: batch_allocations_allocation_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.batch_allocations_allocation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_allocations_allocation_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: batch_allocations_allocation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.batch_allocations_allocation_id_seq OWNED BY public.batch_allocations.allocation_id;


--
-- Name: batch_closure_summary; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
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


ALTER TABLE public.batch_closure_summary OWNER TO "soundscoreDB_owner";

--
-- Name: batch_closure_summary_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.batch_closure_summary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_closure_summary_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: batch_closure_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.batch_closure_summary_id_seq OWNED BY public.batch_closure_summary.id;


--
-- Name: batch_requirements; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
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


ALTER TABLE public.batch_requirements OWNER TO "soundscoreDB_owner";

--
-- Name: batch_requirements_requirement_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.batch_requirements_requirement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_requirements_requirement_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: batch_requirements_requirement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.batch_requirements_requirement_id_seq OWNED BY public.batch_requirements.requirement_id;


--
-- Name: batch_sales; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.batch_sales OWNER TO "soundscoreDB_owner";

--
-- Name: batch_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.batch_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_sales_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: batch_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.batch_sales_id_seq OWNED BY public.batch_sales.id;


--
-- Name: batches; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.batches OWNER TO "soundscoreDB_owner";

--
-- Name: batches_batch_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.batches_batch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batches_batch_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: batches_batch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.batches_batch_id_seq OWNED BY public.batches.batch_id;


--
-- Name: bird_count_history; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.bird_count_history (
    record_id integer NOT NULL,
    batch_id integer NOT NULL,
    record_date date NOT NULL,
    deaths integer DEFAULT 0 NOT NULL,
    additions integer DEFAULT 0 NOT NULL,
    notes text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.bird_count_history OWNER TO "soundscoreDB_owner";

--
-- Name: bird_count_history_record_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.bird_count_history_record_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bird_count_history_record_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: bird_count_history_record_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.bird_count_history_record_id_seq OWNED BY public.bird_count_history.record_id;


--
-- Name: bird_sell_history; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
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


ALTER TABLE public.bird_sell_history OWNER TO "soundscoreDB_owner";

--
-- Name: bird_sell_history_sale_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.bird_sell_history_sale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bird_sell_history_sale_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: bird_sell_history_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.bird_sell_history_sale_id_seq OWNED BY public.bird_sell_history.sale_id;


--
-- Name: farmer_commission_history; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.farmer_commission_history (
    id integer NOT NULL,
    farmer_id integer NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    description character varying,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.farmer_commission_history OWNER TO "soundscoreDB_owner";

--
-- Name: farmer_commission_history_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.farmer_commission_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.farmer_commission_history_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: farmer_commission_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.farmer_commission_history_id_seq OWNED BY public.farmer_commission_history.id;


--
-- Name: farmers; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
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


ALTER TABLE public.farmers OWNER TO "soundscoreDB_owner";

--
-- Name: farmers_farmer_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.farmers_farmer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.farmers_farmer_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: farmers_farmer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.farmers_farmer_id_seq OWNED BY public.farmers.farmer_id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.inventory (
    inventory_id integer NOT NULL,
    item_code character varying(100) NOT NULL,
    current_qty numeric(12,2) DEFAULT 0 NOT NULL,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.inventory OWNER TO "soundscoreDB_owner";

--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.inventory_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_inventory_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.inventory_inventory_id_seq OWNED BY public.inventory.inventory_id;


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.inventory_movements (
    movement_id integer NOT NULL,
    item_code character varying(100) NOT NULL,
    qty_change numeric(12,2) NOT NULL,
    movement_type public.movement_type NOT NULL,
    reference_id integer NOT NULL,
    movement_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.inventory_movements OWNER TO "soundscoreDB_owner";

--
-- Name: inventory_movements_movement_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.inventory_movements_movement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_movements_movement_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: inventory_movements_movement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.inventory_movements_movement_id_seq OWNED BY public.inventory_movements.movement_id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.items (
    item_code character varying(100) NOT NULL,
    item_name character varying(100) NOT NULL,
    item_category public.item_category NOT NULL,
    unit character varying(50) NOT NULL
);


ALTER TABLE public.items OWNER TO "soundscoreDB_owner";

--
-- Name: ledger_accounts; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.ledger_accounts (
    account_id integer NOT NULL,
    name character varying(150) NOT NULL,
    account_type public.ledger_account_type NOT NULL,
    current_balance numeric(18,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ledger_accounts OWNER TO "soundscoreDB_owner";

--
-- Name: ledger_accounts_account_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.ledger_accounts_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ledger_accounts_account_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: ledger_accounts_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.ledger_accounts_account_id_seq OWNED BY public.ledger_accounts.account_id;


--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
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


ALTER TABLE public.ledger_entries OWNER TO "soundscoreDB_owner";

--
-- Name: ledger_entries_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.ledger_entries_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ledger_entries_entry_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: ledger_entries_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.ledger_entries_entry_id_seq OWNED BY public.ledger_entries.entry_id;


--
-- Name: post; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.post (
    id integer NOT NULL,
    title character varying NOT NULL,
    text character varying NOT NULL
);


ALTER TABLE public.post OWNER TO "soundscoreDB_owner";

--
-- Name: post_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.post_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.post_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: post_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.post_id_seq OWNED BY public.post.id;


--
-- Name: production_lines; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.production_lines (
    line_id integer NOT NULL,
    line_name character varying(100) NOT NULL,
    supervisor_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.production_lines OWNER TO "soundscoreDB_owner";

--
-- Name: production_lines_line_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.production_lines_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.production_lines_line_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: production_lines_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.production_lines_line_id_seq OWNED BY public.production_lines.line_id;


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.purchases (
    purchase_id integer NOT NULL,
    item_code character varying(100) NOT NULL,
    cost_per_unit numeric(12,2) NOT NULL,
    total_cost numeric(12,2) NOT NULL,
    quantity numeric(12,2) DEFAULT 0 NOT NULL,
    purchase_date date NOT NULL,
    supplier character varying(100) NOT NULL,
    created_by integer NOT NULL
);


ALTER TABLE public.purchases OWNER TO "soundscoreDB_owner";

--
-- Name: purchases_purchase_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.purchases_purchase_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchases_purchase_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: purchases_purchase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.purchases_purchase_id_seq OWNED BY public.purchases.purchase_id;


--
-- Name: seaql_migrations; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.seaql_migrations (
    version character varying NOT NULL,
    applied_at bigint NOT NULL
);


ALTER TABLE public.seaql_migrations OWNER TO "soundscoreDB_owner";

--
-- Name: stock_receipts; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
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


ALTER TABLE public.stock_receipts OWNER TO "soundscoreDB_owner";

--
-- Name: stock_receipts_lot_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.stock_receipts_lot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_receipts_lot_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: stock_receipts_lot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.stock_receipts_lot_id_seq OWNED BY public.stock_receipts.lot_id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
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


ALTER TABLE public.suppliers OWNER TO "soundscoreDB_owner";

--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.suppliers_supplier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_supplier_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.suppliers_supplier_id_seq OWNED BY public.suppliers.supplier_id;


--
-- Name: traders; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
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


ALTER TABLE public.traders OWNER TO "soundscoreDB_owner";

--
-- Name: traders_trader_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.traders_trader_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.traders_trader_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: traders_trader_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.traders_trader_id_seq OWNED BY public.traders.trader_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: soundscoreDB_owner
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    role public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO "soundscoreDB_owner";

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: soundscoreDB_owner
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO "soundscoreDB_owner";

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: soundscoreDB_owner
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: batch_allocation_lines allocation_line_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_allocation_lines ALTER COLUMN allocation_line_id SET DEFAULT nextval('public.batch_allocation_lines_allocation_line_id_seq'::regclass);


--
-- Name: batch_allocations allocation_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_allocations ALTER COLUMN allocation_id SET DEFAULT nextval('public.batch_allocations_allocation_id_seq'::regclass);


--
-- Name: batch_closure_summary id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_closure_summary ALTER COLUMN id SET DEFAULT nextval('public.batch_closure_summary_id_seq'::regclass);


--
-- Name: batch_requirements requirement_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_requirements ALTER COLUMN requirement_id SET DEFAULT nextval('public.batch_requirements_requirement_id_seq'::regclass);


--
-- Name: batch_sales id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_sales ALTER COLUMN id SET DEFAULT nextval('public.batch_sales_id_seq'::regclass);


--
-- Name: batches batch_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batches ALTER COLUMN batch_id SET DEFAULT nextval('public.batches_batch_id_seq'::regclass);


--
-- Name: bird_count_history record_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.bird_count_history ALTER COLUMN record_id SET DEFAULT nextval('public.bird_count_history_record_id_seq'::regclass);


--
-- Name: bird_sell_history sale_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.bird_sell_history ALTER COLUMN sale_id SET DEFAULT nextval('public.bird_sell_history_sale_id_seq'::regclass);


--
-- Name: farmer_commission_history id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.farmer_commission_history ALTER COLUMN id SET DEFAULT nextval('public.farmer_commission_history_id_seq'::regclass);


--
-- Name: farmers farmer_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.farmers ALTER COLUMN farmer_id SET DEFAULT nextval('public.farmers_farmer_id_seq'::regclass);


--
-- Name: inventory inventory_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.inventory ALTER COLUMN inventory_id SET DEFAULT nextval('public.inventory_inventory_id_seq'::regclass);


--
-- Name: inventory_movements movement_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.inventory_movements ALTER COLUMN movement_id SET DEFAULT nextval('public.inventory_movements_movement_id_seq'::regclass);


--
-- Name: ledger_accounts account_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.ledger_accounts ALTER COLUMN account_id SET DEFAULT nextval('public.ledger_accounts_account_id_seq'::regclass);


--
-- Name: ledger_entries entry_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.ledger_entries ALTER COLUMN entry_id SET DEFAULT nextval('public.ledger_entries_entry_id_seq'::regclass);


--
-- Name: post id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.post ALTER COLUMN id SET DEFAULT nextval('public.post_id_seq'::regclass);


--
-- Name: production_lines line_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.production_lines ALTER COLUMN line_id SET DEFAULT nextval('public.production_lines_line_id_seq'::regclass);


--
-- Name: purchases purchase_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.purchases ALTER COLUMN purchase_id SET DEFAULT nextval('public.purchases_purchase_id_seq'::regclass);


--
-- Name: stock_receipts lot_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.stock_receipts ALTER COLUMN lot_id SET DEFAULT nextval('public.stock_receipts_lot_id_seq'::regclass);


--
-- Name: suppliers supplier_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN supplier_id SET DEFAULT nextval('public.suppliers_supplier_id_seq'::regclass);


--
-- Name: traders trader_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.traders ALTER COLUMN trader_id SET DEFAULT nextval('public.traders_trader_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Data for Name: batch_allocation_lines; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.batch_allocation_lines (allocation_line_id, allocation_id, lot_id, qty, unit_cost, line_value) FROM stdin;
1	1	3	1772.00	34.32	60815.04
2	2	1	16.00	1820.40	29126.40
3	3	3	13.00	34.32	446.16
4	3	4	4679.00	35.06	164045.74
5	4	1	45.00	1820.40	81918.00
6	5	2	46.00	1674.80	77040.80
\.


--
-- Data for Name: batch_allocations; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.batch_allocations (allocation_id, requirement_id, allocated_qty, allocated_value, allocation_date, allocated_by) FROM stdin;
1	1	1772.00	60815.04	2025-09-20	1
2	2	16.00	29126.40	2025-09-20	1
3	3	4692.00	164491.90	2025-09-20	1
4	4	45.00	81918.00	2025-09-20	1
5	5	46.00	77040.80	2025-09-20	1
\.


--
-- Data for Name: batch_closure_summary; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.batch_closure_summary (id, batch_id, start_date, end_date, initial_chicken_count, available_chicken_count, revenue, gross_profit) FROM stdin;
\.


--
-- Data for Name: batch_requirements; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.batch_requirements (requirement_id, batch_id, line_id, supervisor_id, item_code, quantity, status, request_date) FROM stdin;
1	1	1	2	SC101	1772.00	accept	2025-09-20
2	1	1	2	FD101	16.00	accept	2025-09-20
3	2	1	2	SC101	4692.00	accept	2025-09-20
4	2	1	2	FD101	45.00	accept	2025-09-20
5	2	1	2	FD102	46.00	accept	2025-09-20
\.


--
-- Data for Name: batch_sales; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.batch_sales (id, item_code, batch_id, trader_id, avg_weight, rate, quantity, value, created_at) FROM stdin;
\.


--
-- Data for Name: batches; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.batches (batch_id, line_id, supervisor_id, farmer_id, start_date, end_date, initial_bird_count, current_bird_count, status, created_at) FROM stdin;
1	1	2	1	2025-09-15	2025-09-15	1772	1751	open	2025-09-20 15:09:35.978834+00
2	1	2	2	2025-09-06	2025-09-06	4692	4024	open	2025-09-20 15:12:24.848508+00
\.


--
-- Data for Name: bird_count_history; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.bird_count_history (record_id, batch_id, record_date, deaths, additions, notes, created_at) FROM stdin;
1	1	2025-09-16	13	0	13 birds died on 2025-09-16	2025-09-20 15:16:26.050378+00
2	1	2025-09-18	6	0	6 birds died on 2025-09-18	2025-09-20 15:16:45.364687+00
3	2	2025-09-07	15	0	15 birds died on 2025-09-07	2025-09-20 15:17:13.129525+00
4	2	2025-09-08	4	0	4 birds died on 2025-09-08	2025-09-20 15:17:30.718556+00
5	2	2025-09-09	6	0	6 birds died on 2025-09-09	2025-09-20 15:17:41.695336+00
6	2	2025-09-11	15	0	15 birds died on 2025-09-11	2025-09-20 15:17:57.461797+00
7	2	2025-09-13	20	0	20 birds died on 2025-09-13	2025-09-20 15:18:18.217871+00
8	2	2025-09-15	230	0	230 birds died on 2025-09-15	2025-09-20 15:18:31.726133+00
9	2	2025-09-18	186	0	186 birds died on 2025-09-18	2025-09-20 15:18:49.068443+00
10	2	2025-09-19	80	0	80 birds died on 2025-09-19	2025-09-20 15:19:50.466564+00
11	2	2025-09-20	57	0	57 birds died on 2025-09-20	2025-09-21 04:53:00.855574+00
12	1	2025-09-20	2	0	2 birds died on 2025-09-20	2025-09-21 04:53:17.650179+00
13	2	2025-09-21	55	0	55 birds died on 2025-09-21	2025-09-22 04:27:46.254592+00
\.


--
-- Data for Name: bird_sell_history; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.bird_sell_history (sale_id, batch_id, trader_id, sale_date, quantity_sold, price_per_bird, total_amount, notes, created_at) FROM stdin;
\.


--
-- Data for Name: farmer_commission_history; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.farmer_commission_history (id, farmer_id, commission_amount, description, created_at) FROM stdin;
\.


--
-- Data for Name: farmers; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.farmers (farmer_id, name, phone_number, address, bank_account_no, bank_name, ifsc_code, area_size, created_at) FROM stdin;
1	SHIVPUJAN	787898	PIPRA	18828	PNB01	PNB01	1.00	2025-09-20 15:03:47.123263+00
2	SHUBHAM	7878981	PIPRA	121212	PNB011	PNB1881	2.00	2025-09-20 15:04:19.04109+00
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.inventory (inventory_id, item_code, current_qty, last_updated) FROM stdin;
3	SC101	13.00	2025-09-20 15:12:25.775642+00
1	FD101	30.00	2025-09-20 15:14:15.030536+00
2	FD102	0.00	2025-09-20 15:14:36.583997+00
\.


--
-- Data for Name: inventory_movements; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.inventory_movements (movement_id, item_code, qty_change, movement_type, reference_id, movement_date) FROM stdin;
1	FD101	91.00	purchase	1	2025-09-20 15:05:48.974915+00
2	FD102	46.00	purchase	2	2025-09-20 15:06:26.648562+00
3	SC101	1785.00	purchase	3	2025-09-20 15:07:37.842778+00
4	SC101	-1772.00	allocation	1	2025-09-20 15:09:37.005938+00
5	FD101	-16.00	allocation	2	2025-09-20 15:10:08.670346+00
6	SC101	4692.00	purchase	4	2025-09-20 15:11:18.935985+00
7	SC101	-4692.00	allocation	2	2025-09-20 15:12:25.952921+00
8	FD101	-45.00	allocation	4	2025-09-20 15:14:14.275794+00
9	FD102	-46.00	allocation	5	2025-09-20 15:14:35.728751+00
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.items (item_code, item_name, item_category, unit) FROM stdin;
FD101	PRE-STARTER	feed	bags
FD102	STARTER	feed	bags
FD103	FINISHER	feed	bags
MD101	MEDICINE	medicine	set
SC101	SMALL CHICKS	chicks	pcs
DC101	DESI CHICKEN	finished_birds	pcs
\.


--
-- Data for Name: ledger_accounts; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.ledger_accounts (account_id, name, account_type, current_balance, created_at) FROM stdin;
102	inventory-medicine	asset	0.00	2025-08-28 00:00:00+00
108	bird-sales	revenue	0.00	2025-09-06 00:00:00+00
105	liability	liability	0.00	2025-08-29 00:00:00+00
106	commission-farmer	expense	0.00	2025-08-31 00:00:00+00
109	other-expense	expense	0.00	2025-09-20 14:37:29.059606+00
101	cash	asset	1991540.08	2025-08-28 00:00:00+00
104	inventory-chicks	asset	455.78	2025-08-28 00:00:00+00
103	inventory-feed	asset	54612.00	2025-08-28 00:00:00+00
107	farm-expense	expense	413392.14	2025-09-03 00:00:00+00
\.


--
-- Data for Name: ledger_entries; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.ledger_entries (entry_id, account_id, debit, credit, txn_date, reference_table, reference_id, narration, txn_group_id, created_at, created_by) FROM stdin;
1	103	165656.40	\N	2025-09-20	purchases	1	Purchase of 91 (item FD101)	0b0c1738-0cfc-465f-8b61-a753465e7e3d	2025-09-20 15:05:50.316469+00	1
2	101	\N	165656.40	2025-09-20	purchases	1	Payment for purchase of 91 (item FD101)	0b0c1738-0cfc-465f-8b61-a753465e7e3d	2025-09-20 15:05:50.617924+00	1
3	103	77040.80	\N	2025-09-20	purchases	2	Purchase of 46 (item FD102)	019557b3-ada6-4728-8934-2c6fcdc77765	2025-09-20 15:06:27.553263+00	1
4	101	\N	77040.80	2025-09-20	purchases	2	Payment for purchase of 46 (item FD102)	019557b3-ada6-4728-8934-2c6fcdc77765	2025-09-20 15:06:27.72566+00	1
5	104	61261.20	\N	2025-09-20	purchases	3	Purchase of 1785 (item SC101)	d399061b-e8c7-4d4b-bf70-eea28d7633f3	2025-09-20 15:07:38.318005+00	1
6	101	\N	61261.20	2025-09-20	purchases	3	Payment for purchase of 1785 (item SC101)	d399061b-e8c7-4d4b-bf70-eea28d7633f3	2025-09-20 15:07:38.404419+00	1
7	104	\N	60815.04	2025-09-20	batches	1	Chick allocation for batch 1 - Item: SC101	98489c55-e61a-45d4-97eb-db47c20089fb	2025-09-20 15:09:37.873158+00	1
8	107	60815.04	\N	2025-09-20	batches	1	Chick expense for batch 1 - Item: SC101	98489c55-e61a-45d4-97eb-db47c20089fb	2025-09-20 15:09:37.960976+00	1
9	103	\N	29126.40	2025-09-20	allocations	2	approve of (requirement 2)	982f1f6e-210d-47e1-815b-b29fd1ca1f4a	2025-09-20 15:10:10.468591+00	1
10	107	29126.40	\N	2025-09-20	allocations	2	Allocation of - Req #2	982f1f6e-210d-47e1-815b-b29fd1ca1f4a	2025-09-20 15:10:10.556199+00	1
11	104	164501.52	\N	2025-09-20	purchases	4	Purchase of 4692 (item SC101)	a83722d0-bfa1-4f44-819a-3a341b7a9b24	2025-09-20 15:11:19.865131+00	1
12	101	\N	164501.52	2025-09-20	purchases	4	Payment for purchase of 4692 (item SC101)	a83722d0-bfa1-4f44-819a-3a341b7a9b24	2025-09-20 15:11:20.037729+00	1
13	104	\N	164491.90	2025-09-20	batches	2	Chick allocation for batch 2 - Item: SC101	ac571513-6c09-470e-8881-6828fa28bb28	2025-09-20 15:12:27.014614+00	1
14	107	164491.90	\N	2025-09-20	batches	2	Chick expense for batch 2 - Item: SC101	ac571513-6c09-470e-8881-6828fa28bb28	2025-09-20 15:12:27.191039+00	1
15	103	\N	81918.00	2025-09-20	allocations	4	approve of (requirement 4)	85aa915c-ad5a-456c-96a5-b42068b59ea1	2025-09-20 15:14:16.309735+00	1
16	107	81918.00	\N	2025-09-20	allocations	4	Allocation of - Req #4	85aa915c-ad5a-456c-96a5-b42068b59ea1	2025-09-20 15:14:16.597475+00	1
17	103	\N	77040.80	2025-09-20	allocations	5	approve of (requirement 5)	31616910-9e0e-4042-8bdc-ddb537f02a0a	2025-09-20 15:14:37.855584+00	1
18	107	77040.80	\N	2025-09-20	allocations	5	Allocation of - Req #5	31616910-9e0e-4042-8bdc-ddb537f02a0a	2025-09-20 15:14:38.0378+00	1
\.


--
-- Data for Name: post; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.post (id, title, text) FROM stdin;
\.


--
-- Data for Name: production_lines; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.production_lines (line_id, line_name, supervisor_id, created_at) FROM stdin;
1	P1	2	2025-09-20 15:02:38.953083+00
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.purchases (purchase_id, item_code, cost_per_unit, total_cost, quantity, purchase_date, supplier, created_by) FROM stdin;
1	FD101	1820.40	165656.40	91.00	2025-09-20	OM FEED	1
2	FD102	1674.80	77040.80	46.00	2025-09-20	OM FEED	1
3	SC101	34.32	61261.20	1785.00	2025-09-20	VENKY	1
4	SC101	35.06	164501.52	4692.00	2025-09-20	VENKY	1
\.


--
-- Data for Name: seaql_migrations; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
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
-- Data for Name: stock_receipts; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.stock_receipts (lot_id, purchase_id, item_code, received_qty, remaining_qty, unit_cost, received_date, supplier) FROM stdin;
3	3	SC101	1785.00	0.00	34.32	2025-09-20	VENKY
4	4	SC101	4692.00	13.00	35.06	2025-09-20	VENKY
1	1	FD101	91.00	30.00	1820.40	2025-09-20	OM FEED
2	2	FD102	46.00	0.00	1674.80	2025-09-20	OM FEED
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.suppliers (supplier_id, supplier_type, name, phone_number, address, bank_account_no, bank_name, ifsc_code, created_at) FROM stdin;
1	feed	OM FEED	9999912	BHAGWANPUR NAKHA NO 02 GORAKHPUR 	999981	99981	PNB01	2025-09-20 14:58:04.385142+00
2	chick	VENKY	99999121	GORAKHPUR 	9999811	999811	PNBC01	2025-09-20 14:58:41.339128+00
\.


--
-- Data for Name: traders; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.traders (trader_id, name, phone_number, address, bank_account_no, bank_name, ifsc_code, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: soundscoreDB_owner
--

COPY public.users (user_id, name, email, password, role, created_at) FROM stdin;
2	ravi	supertester@gmail.com	$2a$12$lUhwykbvcex1aDLC43B5b.8MgymZ1q9.1sYlmAhxeSzNMWPd4xPzC	supervisor	2025-09-20 14:26:36.120598+00
1	Harshit Singh	singhharshit360@gmail.com	$2a$12$lUhwykbvcex1aDLC43B5b.8MgymZ1q9.1sYlmAhxeSzNMWPd4xPzC	admin	2025-09-20 14:24:33.065401+00
\.


--
-- Name: batch_allocation_lines_allocation_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.batch_allocation_lines_allocation_line_id_seq', 6, true);


--
-- Name: batch_allocations_allocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.batch_allocations_allocation_id_seq', 5, true);


--
-- Name: batch_closure_summary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.batch_closure_summary_id_seq', 1, false);


--
-- Name: batch_requirements_requirement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.batch_requirements_requirement_id_seq', 5, true);


--
-- Name: batch_sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.batch_sales_id_seq', 1, false);


--
-- Name: batches_batch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.batches_batch_id_seq', 2, true);


--
-- Name: bird_count_history_record_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.bird_count_history_record_id_seq', 13, true);


--
-- Name: bird_sell_history_sale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.bird_sell_history_sale_id_seq', 1, false);


--
-- Name: farmer_commission_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.farmer_commission_history_id_seq', 1, false);


--
-- Name: farmers_farmer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.farmers_farmer_id_seq', 2, true);


--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.inventory_inventory_id_seq', 3, true);


--
-- Name: inventory_movements_movement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.inventory_movements_movement_id_seq', 9, true);


--
-- Name: ledger_accounts_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.ledger_accounts_account_id_seq', 102, true);


--
-- Name: ledger_entries_entry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.ledger_entries_entry_id_seq', 18, true);


--
-- Name: post_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.post_id_seq', 1, false);


--
-- Name: production_lines_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.production_lines_line_id_seq', 1, true);


--
-- Name: purchases_purchase_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.purchases_purchase_id_seq', 4, true);


--
-- Name: stock_receipts_lot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.stock_receipts_lot_id_seq', 4, true);


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.suppliers_supplier_id_seq', 2, true);


--
-- Name: traders_trader_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.traders_trader_id_seq', 1, false);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: soundscoreDB_owner
--

SELECT pg_catalog.setval('public.users_user_id_seq', 2, true);


--
-- Name: batch_allocation_lines batch_allocation_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_allocation_lines
    ADD CONSTRAINT batch_allocation_lines_pkey PRIMARY KEY (allocation_line_id);


--
-- Name: batch_allocations batch_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_allocations
    ADD CONSTRAINT batch_allocations_pkey PRIMARY KEY (allocation_id);


--
-- Name: batch_closure_summary batch_closure_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_closure_summary
    ADD CONSTRAINT batch_closure_summary_pkey PRIMARY KEY (id);


--
-- Name: batch_requirements batch_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT batch_requirements_pkey PRIMARY KEY (requirement_id);


--
-- Name: batch_sales batch_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT batch_sales_pkey PRIMARY KEY (id);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (batch_id);


--
-- Name: bird_count_history bird_count_history_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.bird_count_history
    ADD CONSTRAINT bird_count_history_pkey PRIMARY KEY (record_id);


--
-- Name: bird_sell_history bird_sell_history_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.bird_sell_history
    ADD CONSTRAINT bird_sell_history_pkey PRIMARY KEY (sale_id);


--
-- Name: farmer_commission_history farmer_commission_history_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.farmer_commission_history
    ADD CONSTRAINT farmer_commission_history_pkey PRIMARY KEY (id);


--
-- Name: farmers farmers_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.farmers
    ADD CONSTRAINT farmers_phone_number_key UNIQUE (phone_number);


--
-- Name: farmers farmers_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.farmers
    ADD CONSTRAINT farmers_pkey PRIMARY KEY (farmer_id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (movement_id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (item_code);


--
-- Name: ledger_accounts ledger_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_pkey PRIMARY KEY (account_id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (entry_id);


--
-- Name: post post_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_pkey PRIMARY KEY (id);


--
-- Name: production_lines production_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.production_lines
    ADD CONSTRAINT production_lines_pkey PRIMARY KEY (line_id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (purchase_id);


--
-- Name: seaql_migrations seaql_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.seaql_migrations
    ADD CONSTRAINT seaql_migrations_pkey PRIMARY KEY (version);


--
-- Name: stock_receipts stock_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_pkey PRIMARY KEY (lot_id);


--
-- Name: suppliers suppliers_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_phone_number_key UNIQUE (phone_number);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id);


--
-- Name: traders traders_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.traders
    ADD CONSTRAINT traders_phone_number_key UNIQUE (phone_number);


--
-- Name: traders traders_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.traders
    ADD CONSTRAINT traders_pkey PRIMARY KEY (trader_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_ledger_entries_account_id; Type: INDEX; Schema: public; Owner: soundscoreDB_owner
--

CREATE INDEX idx_ledger_entries_account_id ON public.ledger_entries USING btree (account_id);


--
-- Name: idx_ledger_entries_txn_group_id; Type: INDEX; Schema: public; Owner: soundscoreDB_owner
--

CREATE INDEX idx_ledger_entries_txn_group_id ON public.ledger_entries USING btree (txn_group_id);


--
-- Name: idx_unique_ledger_accounts_name; Type: INDEX; Schema: public; Owner: soundscoreDB_owner
--

CREATE UNIQUE INDEX idx_unique_ledger_accounts_name ON public.ledger_accounts USING btree (name);


--
-- Name: batch_closure_summary batch_closure_summary_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_closure_summary
    ADD CONSTRAINT batch_closure_summary_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: farmer_commission_history farmer_commission_history_farmer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.farmer_commission_history
    ADD CONSTRAINT farmer_commission_history_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmers(farmer_id) ON DELETE CASCADE;


--
-- Name: batch_sales fk-batch_sales-batch_id; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT "fk-batch_sales-batch_id" FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: batch_sales fk-batch_sales-item_code; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT "fk-batch_sales-item_code" FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON DELETE CASCADE;


--
-- Name: batch_sales fk-batch_sales-trader_id; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_sales
    ADD CONSTRAINT "fk-batch_sales-trader_id" FOREIGN KEY (trader_id) REFERENCES public.traders(trader_id) ON DELETE CASCADE;


--
-- Name: batch_allocation_lines fk_allocation_lines_allocation; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_allocation_lines
    ADD CONSTRAINT fk_allocation_lines_allocation FOREIGN KEY (allocation_id) REFERENCES public.batch_allocations(allocation_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: batch_allocation_lines fk_allocation_lines_lot; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_allocation_lines
    ADD CONSTRAINT fk_allocation_lines_lot FOREIGN KEY (lot_id) REFERENCES public.stock_receipts(lot_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: batch_allocations fk_batch_allocations_requirement; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_allocations
    ADD CONSTRAINT fk_batch_allocations_requirement FOREIGN KEY (requirement_id) REFERENCES public.batch_requirements(requirement_id);


--
-- Name: batch_allocations fk_batch_allocations_user; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_allocations
    ADD CONSTRAINT fk_batch_allocations_user FOREIGN KEY (allocated_by) REFERENCES public.users(user_id);


--
-- Name: batch_requirements fk_batch_requirements_batch; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id);


--
-- Name: batch_requirements fk_batch_requirements_item; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_item FOREIGN KEY (item_code) REFERENCES public.items(item_code);


--
-- Name: batch_requirements fk_batch_requirements_line; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_line FOREIGN KEY (line_id) REFERENCES public.production_lines(line_id);


--
-- Name: batch_requirements fk_batch_requirements_supervisor; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batch_requirements
    ADD CONSTRAINT fk_batch_requirements_supervisor FOREIGN KEY (supervisor_id) REFERENCES public.users(user_id);


--
-- Name: batches fk_batches_farmer; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT fk_batches_farmer FOREIGN KEY (farmer_id) REFERENCES public.farmers(farmer_id);


--
-- Name: batches fk_batches_line; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT fk_batches_line FOREIGN KEY (line_id) REFERENCES public.production_lines(line_id);


--
-- Name: batches fk_batches_supervisor; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT fk_batches_supervisor FOREIGN KEY (supervisor_id) REFERENCES public.users(user_id);


--
-- Name: bird_count_history fk_bird_count_history_batch; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.bird_count_history
    ADD CONSTRAINT fk_bird_count_history_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: bird_sell_history fk_bird_sell_history_batch; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.bird_sell_history
    ADD CONSTRAINT fk_bird_sell_history_batch FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE;


--
-- Name: bird_sell_history fk_bird_sell_history_trader; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.bird_sell_history
    ADD CONSTRAINT fk_bird_sell_history_trader FOREIGN KEY (trader_id) REFERENCES public.traders(trader_id);


--
-- Name: inventory fk_inventory_item; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT fk_inventory_item FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON DELETE CASCADE;


--
-- Name: inventory_movements fk_inventory_movements_item; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT fk_inventory_movements_item FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON DELETE CASCADE;


--
-- Name: ledger_entries fk_ledger_entries_account; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT fk_ledger_entries_account FOREIGN KEY (account_id) REFERENCES public.ledger_accounts(account_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ledger_entries fk_ledger_entries_created_by; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT fk_ledger_entries_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: production_lines fk_production_lines_supervisor; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.production_lines
    ADD CONSTRAINT fk_production_lines_supervisor FOREIGN KEY (supervisor_id) REFERENCES public.users(user_id);


--
-- Name: purchases fk_purchases_created_by; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT fk_purchases_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: purchases fk_purchases_item_code; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT fk_purchases_item_code FOREIGN KEY (item_code) REFERENCES public.items(item_code);


--
-- Name: stock_receipts fk_stock_receipts_item; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT fk_stock_receipts_item FOREIGN KEY (item_code) REFERENCES public.items(item_code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_receipts fk_stock_receipts_purchase; Type: FK CONSTRAINT; Schema: public; Owner: soundscoreDB_owner
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT fk_stock_receipts_purchase FOREIGN KEY (purchase_id) REFERENCES public.purchases(purchase_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

