import { useQuery } from "@tanstack/react-query";
import { fetchTraders } from "../api/traders";
import { fetchBatches } from "../api/batches";
import { fetchItems } from "../api/items";

// fix re fetches (imp)
export const useTraders = () => {
    return useQuery({
        queryKey: ["traders_new"],
        queryFn: fetchTraders,
        staleTime: 1000 * 60 * 10, // 10 mins
    });
};

export const useAllBatches = () => {
    return useQuery({
        queryKey: ["batches_list"],
        queryFn: fetchBatches,
        staleTime: 1000 * 60 * 5,
    });
};

export const useItems = () => {
    return useQuery({
        queryKey: ["items_new"],
        queryFn: fetchItems,
        staleTime: 1000 * 60 * 10,
    });
};