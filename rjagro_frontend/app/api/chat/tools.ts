import { Type, FunctionDeclaration } from '@google/genai';

export interface ToolMeta {
    endpoint: string;
    method: 'GET' | 'POST';
    pathParams?: string[];
}

export const toolRegistry: Record<string, ToolMeta> = {
    get_all_batches: {
        endpoint: '/getall/batches',
        method: 'GET',
    },
    get_batch_by_id: {
        endpoint: '/getbyid/batches/{batch_id}',
        method: 'GET',
        pathParams: ['batch_id'],
    },
    get_batch_requirements: {
        endpoint: '/getall/batch_requirements',
        method: 'GET',
    },
    get_inventory: {
        endpoint: '/getall/inventory',
        method: 'GET',
    },
    get_items: {
        endpoint: '/getall/items',
        method: 'GET',
    },
    get_traders: {
        endpoint: '/getall/traders',
        method: 'GET',
    },
    get_suppliers: {
        endpoint: '/getall/suppliers',
        method: 'GET',
    },
    get_farmers: {
        endpoint: '/getall/farmers',
        method: 'GET',
    },
    get_bird_count_history: {
        endpoint: '/getbyid/bird_count_history/{batch_id}',
        method: 'GET',
        pathParams: ['batch_id'],
    },
    get_batch_sales: {
        endpoint: '/getbyid/sales/{batch_id}',
        method: 'GET',
        pathParams: ['batch_id'],
    },
    get_batch_closure_summary: {
        endpoint: '/getall/batch_closure_summary',
        method: 'GET',
    },
    get_loans: {
        endpoint: '/getall/loans',
        method: 'GET',
    },
    get_purchases: {
        endpoint: '/getall/purchases',
        method: 'GET',
    },
    get_ledger_entries: {
        endpoint: '/getall/ledger_entries',
        method: 'GET',
    },
    get_trader_receivables: {
        endpoint: '/getbyid/trader_receivables/{trader_id}',
        method: 'GET',
        pathParams: ['trader_id'],
    },
    get_supplier_payables: {
        endpoint: '/getbyid/get_supplier_payables/{supplier_id}',
        method: 'GET',
        pathParams: ['supplier_id'],
    },
};

export const functionDeclarations: FunctionDeclaration[] = [
    {
        name: 'get_all_batches',
        description:
            'Get all poultry batches with their supervisor name, farmer name, bird counts, status, and dates. Use this when the user asks about batches, active batches, or wants an overview of current batches.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_batch_by_id',
        description:
            'Get details of a specific batch by its ID, including supervisor, farmer, bird counts, and status. Use when the user asks about a particular batch number.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                batch_id: {
                    type: Type.NUMBER,
                    description: 'The numeric batch ID',
                },
            },
            required: ['batch_id'],
        },
    },
    {
        name: 'get_batch_requirements',
        description:
            'Get all batch requirements (feed, medicine, chicks) with their approval status (pending/accepted/declined), quantities, and associated batch/supervisor info. Use when the user asks about requirements, pending approvals, or material requests.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_inventory',
        description:
            'Get current inventory stock levels for all items. Shows item_code, current_qty, and last_updated. Use when the user asks about stock levels, what is in stock, or inventory status.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_items',
        description:
            'Get the catalog of all items (feed, medicine, chicks, finished birds) with their item_code, name, unit, and category. Use to look up item names or understand what items exist.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_traders',
        description:
            'Get all traders (buyers) with their contact info and amount_due (receivable balance). Use when the user asks about traders, buyer balances, or who owes money.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_suppliers',
        description:
            'Get all suppliers with their type (feed/chick/medicine), contact info, and amount_due (payable balance). Use when the user asks about suppliers, payables, or what is owed to suppliers.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_farmers',
        description:
            'Get all farmers with their name, phone, address, bank details, and area size. Use when the user asks about farmers or farm details.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_bird_count_history',
        description:
            'Get the bird count history (deaths, additions, dates) for a specific batch. Use when the user asks about mortality, bird deaths, or bird count changes for a batch.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                batch_id: {
                    type: Type.NUMBER,
                    description: 'The numeric batch ID',
                },
            },
            required: ['batch_id'],
        },
    },
    {
        name: 'get_batch_sales',
        description:
            'Get all sales records for a specific batch, including trader, quantity, rate, average weight, and sale date. Use when the user asks about sales for a batch or revenue from a batch.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                batch_id: {
                    type: Type.NUMBER,
                    description: 'The numeric batch ID',
                },
            },
            required: ['batch_id'],
        },
    },
    {
        name: 'get_batch_closure_summary',
        description:
            'Get batch closure summaries with revenue, gross profit, start/end dates, initial and final chicken counts. Use when the user asks for profit, revenue, financial summaries, or closed batch performance.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_loans',
        description:
            'Get all loans with lender name, principal amount, interest rate, status (active/closed), and dates. Use when the user asks about loans, debt, or borrowing.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_purchases',
        description:
            'Get all purchase records with item details, supplier, cost per unit, quantity, total cost, and payment type. Use when the user asks about purchases, spending, or what was bought.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_ledger_entries',
        description:
            'Get all ledger (accounting) entries with account, debit, credit, transaction date, and description. Use when the user asks about accounting, ledger, financial transactions, or specific account movements.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'get_trader_receivables',
        description:
            'Get detailed receivable records for a specific trader — what they owe for each transaction. Use when the user asks about a specific trader\'s outstanding balance details.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                trader_id: {
                    type: Type.NUMBER,
                    description: 'The numeric trader ID',
                },
            },
            required: ['trader_id'],
        },
    },
    {
        name: 'get_supplier_payables',
        description:
            'Get detailed payable records for a specific supplier — what is owed to them for each transaction. Use when the user asks about a specific supplier\'s outstanding balance details.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                supplier_id: {
                    type: Type.NUMBER,
                    description: 'The numeric supplier ID',
                },
            },
            required: ['supplier_id'],
        },
    },
];
