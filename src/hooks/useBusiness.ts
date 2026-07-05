import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export function useBusiness() {
  const { user } = useAuth();

  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: ["business"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}/api/settings`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    enabled: !!user,
  });

  return {
    profile: user,
    business: business || {},
    userRole: user?.role,
    isLoading: businessLoading,
    businessId: business?.id || 1,
  };
}
