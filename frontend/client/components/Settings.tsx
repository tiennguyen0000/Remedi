import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Settings as SettingsIcon,
  User,
  Palette,
  MessageSquare,
  LogOut,
  Trash2,
  Moon,
  Sun,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SettingSection = "main" | "profile" | "appearance" | "feedback";

export function Settings() {
  const [open, setOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<SettingSection>("main");
  const [darkMode, setDarkMode] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [feedback, setFeedback] = useState("");

  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Dispatch event to minimize chat when settings opens
  useEffect(() => {
    if (open) {
      window.dispatchEvent(new Event('settings-opened'));
    }
  }, [open]);

  // Pre-fill profile data when user changes or sheet opens
  useEffect(() => {
    if (user && open) {
      setProfileData({
        name: user.ho_ten || "",
        email: user.email || "",
        phone: user.so_dien_thoai || "",
        address: user.dia_chi || "",
      });
    }
  }, [user, open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    try {
      await apiFetch("/api/users/profile/me", {
        method: "DELETE",
      });

      logout();
      setOpen(false);
      navigate("/login");
      toast({
        description: "Tài khoản đã được xóa thành công",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể xóa tài khoản. Vui lòng thử lại.",
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      await apiFetch("/api/users/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ho_ten: profileData.name,
          email: profileData.email,
          so_dien_thoai: profileData.phone,
          dia_chi: profileData.address,
        }),
      });

      toast({
        description: "Cập nhật thông tin thành công",
      });
      
      // Reload user data
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể cập nhật thông tin. Vui lòng thử lại.",
      });
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      await apiFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: feedback }),
      });

      setFeedback("");
      toast({
        description: "Thank you for your feedback!",
      });
      setCurrentSection("main");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
      });
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem("darkMode", newMode.toString());
  };

  const renderContent = () => {
    switch (currentSection) {
      case "profile":
        return (
          <div className="space-y-4 py-4">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => setCurrentSection("main")}
            >
              ← Back
            </Button>
            <div className="space-y-4">
              {/* Points Display (Read-only) */}
              {user && user.diem_tich_luy !== undefined && (
                <div className="space-y-2 p-4 bg-primary/10 rounded-lg">
                  <Label>Điểm tích lũy</Label>
                  <div className="text-2xl font-bold text-primary">
                    {user.diem_tich_luy} điểm
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Điểm tích lũy hiện tại của bạn
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phone: e.target.value })
                  }
                  placeholder="Your phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={profileData.address}
                  onChange={(e) =>
                    setProfileData({ ...profileData, address: e.target.value })
                  }
                  placeholder="Your address"
                />
              </div>
              <Button onClick={handleSaveProfile} className="w-full">
                Save Changes
              </Button>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-4 py-4">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => setCurrentSection("main")}
            >
              ← Back
            </Button>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <div className="text-sm text-muted-foreground">
                  Enable dark mode for a better viewing experience
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>
          </div>
        );

      case "feedback":
        return (
          <div className="space-y-4 py-4">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => setCurrentSection("main")}
            >
              ← Back
            </Button>
            <div className="space-y-4">
              <Label htmlFor="feedback">Your Feedback</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us what you think about our app..."
                className="min-h-[150px]"
              />
              <Button onClick={handleSubmitFeedback} className="w-full">
                Submit Feedback
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4 py-4">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent rounded-lg"
              onClick={() => setCurrentSection("profile")}
            >
              <div className="flex items-center gap-3">
                <User className="h-5 w-5" />
                <span>Personal Information</span>
              </div>
              <ChevronRight className="h-5 w-5" />
            </div>

            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent rounded-lg"
              onClick={() => setCurrentSection("appearance")}
            >
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5" />
                <span>Appearance</span>
              </div>
              <ChevronRight className="h-5 w-5" />
            </div>

            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent rounded-lg"
              onClick={() => setCurrentSection("feedback")}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5" />
                <span>Send Feedback</span>
              </div>
              <ChevronRight className="h-5 w-5" />
            </div>

            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent rounded-lg text-orange-600"
              onClick={handleLogout}
            >
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5" />
                <span>Log Out</span>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent rounded-lg text-red-600">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5" />
                    <span>Delete Account</span>
                  </div>
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove all of your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}
