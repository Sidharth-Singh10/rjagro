import React from 'react';
import { X, Save } from 'lucide-react';
import { NewTrader } from '@/app/types/interfaces';

interface AddTraderFormProps {
    newTrader: NewTrader;
    setNewTrader: React.Dispatch<React.SetStateAction<NewTrader>>;
    onSave: () => void;
    onCancel: () => void;
}

const AddTraderForm: React.FC<AddTraderFormProps> = ({
    newTrader,
    setNewTrader,
    onSave,
    onCancel,
}) => {
    const handleChange = (field: keyof NewTrader, value: string) => {
        setNewTrader((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Add New Trader</h3>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 text-gray-900 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InputField
                    label="Name"
                    value={newTrader.name}
                    onChange={(val: string) => handleChange('name', val)}
                    placeholder="Trader name"
                />
                <InputField
                    label="Phone Number"
                    value={newTrader.phone_number}
                    onChange={(val: string) => handleChange('phone_number', val)}
                    placeholder="Phone number"
                />
                <InputField
                    label="Address"
                    value={newTrader.address}
                    onChange={(val: string) => handleChange('address', val)}
                    placeholder="Address"
                />
                <InputField
                    label="Bank Account No"
                    value={newTrader.bank_account_no}
                    onChange={(val: string) => handleChange('bank_account_no', val)}
                    placeholder="Account number"
                />
                <InputField
                    label="Bank Name"
                    value={newTrader.bank_name}
                    onChange={(val: string) => handleChange('bank_name', val)}
                    placeholder="Bank name"
                />
                <InputField
                    label="IFSC Code"
                    value={newTrader.ifsc_code}
                    onChange={(val: string) => handleChange('ifsc_code', val)}
                    placeholder="IFSC Code"
                />

                <div className="flex items-end">
                    <button
                        onClick={onSave}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Save size={18} />
                        Save Trader
                    </button>
                </div>
            </div>
        </div>
    );
};

const InputField = ({ label, value, onChange, placeholder }: any) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label} *</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder={placeholder}
        />
    </div>
);

export default AddTraderForm;