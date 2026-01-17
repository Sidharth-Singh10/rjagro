import { useQuery } from "@tanstack/react-query";
import { fetchTraders } from "../api/traders";
import { fetchBatches } from "../api/batches";

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
        queryKey: ["batches_list"], // Different key from ["batches", id]
        queryFn: fetchBatches,
        staleTime: 1000 * 60 * 5,
    });
};