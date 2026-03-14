import { useQuery } from "@tanstack/react-query";
import { fetchTraders } from "../api/traders";
import { fetchBatches } from "../api/batches";
import { fetchItems } from "../api/items";

const STALE_10 = 1000 * 60 * 10;
const STALE_5 = 1000 * 60 * 5;

export const useTraders = () => {
    return useQuery({
        queryKey: ["traders"],
        queryFn: fetchTraders,
        staleTime: STALE_10,
    });
};

export const useAllBatches = () => {
    return useQuery({
        queryKey: ["batches"],
        queryFn: fetchBatches,
        staleTime: STALE_5,
    });
};

export const useItems = () => {
    return useQuery({
        queryKey: ["items"],
        queryFn: fetchItems,
        staleTime: STALE_10,
    });
};