import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, LogOut, User, BookOpen, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Profile() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch folders to calculate stats
  const { data: folders = [] } = trpc.vocabulary.getFolders.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Calculate statistics
  const totalFolders = folders.length;
  const totalWords = folders.length; // Placeholder - would need to fetch all words
  const totalKnown = Math.floor(totalWords * 0.3); // Placeholder

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-[#0F1720] text-white flex flex-col max-w-[390px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-[#15202B]">
        <button
          onClick={() => setLocation("/")}
          className="p-2 -ml-2 hover:bg-[#15202B] rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-bold">Profile</h1>
        <div className="w-6" />
      </div>

      {/* Profile Section */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[#0EA5FF] rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{user?.name || "User"}</h2>
            <p className="text-[#A6B0BE]">{user?.email || "No email"}</p>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="px-6 py-4">
        <h3 className="text-lg font-semibold text-white mb-4">Learning Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-[#15202B] border-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-[#0EA5FF]" />
              <span className="text-[#A6B0BE] text-sm">Folders</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalFolders}</p>
          </Card>

          <Card className="bg-[#15202B] border-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
              <span className="text-[#A6B0BE] text-sm">Words Known</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalKnown}</p>
          </Card>

          <Card className="bg-[#15202B] border-0 p-4 col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[#A6B0BE]">Total Words</span>
              <p className="text-2xl font-bold text-white">{totalWords}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Account Section */}
      <div className="px-6 py-4 flex-1">
        <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
        <Card className="bg-[#15202B] border-0 p-4 mb-4">
          <div className="space-y-3">
            <div>
              <p className="text-[#A6B0BE] text-sm">Email</p>
              <p className="text-white">{user?.email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-[#A6B0BE] text-sm">Login Method</p>
              <p className="text-white">{user?.loginMethod || "Manus OAuth"}</p>
            </div>
            <div>
              <p className="text-[#A6B0BE] text-sm">Member Since</p>
              <p className="text-white">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "Recently"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Logout Button */}
      <div className="px-6 py-4 border-t border-[#15202B]">
        <Button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
