'use client'
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, ArrowLeftRight, ClipboardList, Layers } from 'lucide-react';
import { fetchItems, handleAddItem } from '@/app/api/items';
import { fetchInventory, handleAddInventory, handleUpdateInventory } from '@/app/api/inventory';
import { fetchInventoryMovements, handleAddInventoryMovement } from '@/app/api/inventory_movement';
import { fetchStockReceipts, handleAddStockReceipt } from '@/app/api/stock_receipts';
import { fetchPurchases } from '@/app/api/purchases';
import { fetchSuppliers } from '@/app/api/supplier';
import { ItemCategory } from '@/app/types/enums';
import { InventoryMovementPayload, InventoryPayload, Item, MovementType, NewInventory, NewInventoryMovement, NewStockReceipt, StockReceiptPayload } from '@/app/types/interfaces';
import InventoryTable from '../tables/inventory';
import ItemsTable from '../tables/items';
import InventoryMovementsTable from '../tables/inventory_movement';
import StockReceiptsTable from '../tables/stock_receipts';

const InventoryModule = () => {
    const queryClient = useQueryClient();
    const [subTab, setSubTab] = useState<'Levels' | 'Items' | 'Movements' | 'Receipts'>('Levels');

    // Shared Loading/Form State
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // --- Data Fetching ---
    const { data: items = [] } = useQuery({
        queryKey: ['items'],
        queryFn: fetchItems,
        staleTime: 5 * 60 * 1000,
    });

    const { data: inventory = [] } = useQuery({
        queryKey: ['inventory'],
        queryFn: fetchInventory,
        staleTime: 5 * 60 * 1000,
    });

    const { data: inventoryMovements = [] } = useQuery({
        queryKey: ["inventory_movements"],
        queryFn: fetchInventoryMovements,
        staleTime: 5 * 60 * 1000,
    });

    const { data: stockReceipts = [] } = useQuery({
        queryKey: ['stock_receipts'],
        queryFn: fetchStockReceipts,
        staleTime: 5 * 60 * 1000,
    });

    // Required for Stock Receipts dropdowns
    const { data: purchases = [] } = useQuery({
        queryKey: ['purchases'],
        queryFn: fetchPurchases,
        staleTime: 5 * 60 * 1000,
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: fetchSuppliers,
        staleTime: 5 * 60 * 1000,
    });

    // --- STATE & HANDLERS: ITEMS ---
    const [newItem, setNewItem] = useState<Item>({
        item_code: '',
        item_name: '',
        unit: '',
        item_category: ItemCategory.Feed
    });

    const onAddItem = () => {
        handleAddItem(newItem, queryClient, setLoading);
    };

    // --- STATE & HANDLERS: INVENTORY LEVELS ---
    const [newInventory, setNewInventory] = useState<NewInventory>({
        item_code: '',
        item_name: '',
        current_qty: ''
    });

    const handleInventoryItemCodeSelect = (itemCode: string) => {
        const selectedItem = items.find(item => item.item_code === itemCode);
        if (selectedItem) {
            setNewInventory(prev => ({
                ...prev,
                item_code: itemCode,
                item_name: selectedItem.item_name
            }));
        }
    };

    const onAddInventory = () => {
        const finalInventory: InventoryPayload = {
            item_code: newInventory.item_code,
            current_qty: Number(newInventory.current_qty),
        };

        handleAddInventory(finalInventory, queryClient, setLoading, () => {
            setNewInventory({ item_code: '', item_name: '', current_qty: '' });
            setShowAddForm(false);
        });
    };

    const onUpdateInventory = (item_code: string, current_qty: number) => {
        handleUpdateInventory(item_code, { current_qty }, queryClient);
    };

    // --- STATE & HANDLERS: MOVEMENTS ---
    const [newMovement, setNewMovement] = useState<NewInventoryMovement>({
        item_code: '',
        item_name: '',
        qty_change: '',
        movement_type: MovementType.PURCHASE,
        reference_id: '',
        movement_date: new Date().toISOString().slice(0, 10)
    });

    const handleMovementItemCodeSelect = (itemCode: string) => {
        const selectedItem = items.find(item => item.item_code === itemCode);
        if (selectedItem) {
            setNewMovement(prev => ({
                ...prev,
                item_code: itemCode,
                item_name: selectedItem.item_name
            }));
        }
    };

    const onAddMovement = () => {
        const movementPayload: InventoryMovementPayload = {
            item_code: newMovement.item_code,
            qty_change: Number(newMovement.qty_change),
            movement_type: newMovement.movement_type,
            reference_id: newMovement.reference_id ? Number(newMovement.reference_id) : undefined,
            movement_date: newMovement.movement_date,
        };

        handleAddInventoryMovement(movementPayload, queryClient, setLoading, () => {
            setShowAddForm(false);
            setNewMovement({
                item_code: '',
                item_name: '',
                qty_change: '',
                movement_type: MovementType.PURCHASE,
                reference_id: '',
                movement_date: new Date().toISOString().slice(0, 10)
            });
        });
    };

    // --- STATE & HANDLERS: STOCK RECEIPTS ---
    const [newStockReceipt, setNewStockReceipt] = useState<NewStockReceipt>({
        purchase_id: '',
        item_code: '',
        item_name: '',
        received_qty: '',
        remaining_qty: '',
        unit_cost: '',
        received_date: new Date().toISOString().slice(0, 10),
        supplier: ''
    });

    const handleStockReceiptItemCodeSelect = (itemCode: string) => {
        const selectedItem = items.find(item => item.item_code === itemCode);
        if (selectedItem) {
            setNewStockReceipt(prev => ({
                ...prev,
                item_code: itemCode,
                item_name: selectedItem.item_name
            }));
        }
    };

    const handleStockReceiptPurchaseSelect = (purchaseId: string) => {
        const selectedPurchase = purchases.find(purchase => purchase.purchase_id === parseInt(purchaseId));
        if (selectedPurchase) {
            setNewStockReceipt(prev => ({
                ...prev,
                purchase_id: parseInt(purchaseId),
                item_code: selectedPurchase.item_code,
                item_name: selectedPurchase.item_name,
                unit_cost: selectedPurchase.cost_per_unit,
                supplier: suppliers.find(s => s.supplier_id === selectedPurchase.supplier_id)?.name || ''
            }));
        } else {
            setNewStockReceipt(prev => ({
                ...prev,
                purchase_id: purchaseId ? parseInt(purchaseId) : ''
            }));
        }
    };

    const onAddStockReceipt = () => {
        const finalStockReceipt: StockReceiptPayload = {
            purchase_id: newStockReceipt.purchase_id ? Number(newStockReceipt.purchase_id) : undefined,
            item_code: newStockReceipt.item_code,
            received_qty: Number(newStockReceipt.received_qty),
            unit_cost: Number(newStockReceipt.unit_cost),
            received_date: newStockReceipt.received_date,
            supplier: newStockReceipt.supplier || undefined,
        };
        handleAddStockReceipt(finalStockReceipt, queryClient, setLoading);
    };

    return (
        <div className="space-y-6">
            {/* Inner Module Navigation */}
            <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 pb-2">
                <button
                    onClick={() => { setSubTab('Levels'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Levels' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    <span>Current Stock</span>
                </button>
                <button
                    onClick={() => { setSubTab('Items'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Items' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Package className="w-4 h-4" />
                    <span>Item Master</span>
                </button>
                <button
                    onClick={() => { setSubTab('Movements'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Movements' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Stock Movements</span>
                </button>
                <button
                    onClick={() => { setSubTab('Receipts'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Receipts' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    <span>Stock Receipts</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[500px]">
                {subTab === 'Levels' && (
                    <InventoryTable
                        inventory={inventory}
                        items={items}
                        loading={loading}
                        showAddForm={showAddForm}
                        newInventory={newInventory}
                        setShowAddForm={setShowAddForm}
                        setNewInventory={setNewInventory}
                        handleItemCodeSelect={handleInventoryItemCodeSelect}
                        handleAddInventory={onAddInventory}
                        handleUpdateInventory={onUpdateInventory}
                    />
                )}

                {subTab === 'Items' && (
                    <ItemsTable
                        items={items}
                        loading={loading}
                        showAddForm={showAddForm}
                        newItem={newItem}
                        setShowAddForm={setShowAddForm}
                        setNewItem={setNewItem}
                        handleAddItem={onAddItem}
                    />
                )}

                {subTab === 'Movements' && (
                    <InventoryMovementsTable
                        inventoryMovements={inventoryMovements}
                        items={items}
                        loading={loading}
                        showAddForm={showAddForm}
                        newMovement={newMovement}
                        setShowAddForm={setShowAddForm}
                        setNewMovement={setNewMovement}
                        handleItemCodeSelect={handleMovementItemCodeSelect}
                        handleAddMovement={onAddMovement}
                    />
                )}

                {subTab === 'Receipts' && (
                    <StockReceiptsTable
                        stockReceipts={stockReceipts}
                        items={items}
                        purchases={purchases}
                        loading={loading}
                        showAddForm={showAddForm}
                        newStockReceipt={newStockReceipt}
                        setShowAddForm={setShowAddForm}
                        setNewStockReceipt={setNewStockReceipt}
                        handleItemCodeSelect={handleStockReceiptItemCodeSelect}
                        handlePurchaseSelect={handleStockReceiptPurchaseSelect}
                        handleAddStockReceipt={onAddStockReceipt}
                    />
                )}
            </div>
        </div>
    );
};

export default InventoryModule;