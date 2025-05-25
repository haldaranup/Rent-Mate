"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HomeIcon, LogOut, Moon, Sun, UserCircle2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LocalStorageService from "@/lib/localStorage";
import { User as UserType } from "@/types/user"; // Assuming you have this type

export function Navbar() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [userInitial, setUserInitial] = useState<string>("U");

  useEffect(() => {
    const updateUserState = () => {
      const token = LocalStorageService.get<string>("rentmate_token");
      const userStr = LocalStorageService.get<string>("rentmate_user");
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr) as UserType;
          setCurrentUser(user);
          if (user.name) {
            setUserInitial(user.name.charAt(0).toUpperCase());
          } else if (user.email) {
            setUserInitial(user.email.charAt(0).toUpperCase());
          }
        } catch (e) {
          console.error("Failed to parse user from localStorage", e);
          setCurrentUser(null); 
        }
      } else {
        setCurrentUser(null); 
      }
    };

    updateUserState(); // Initial check

    window.addEventListener('authChange', updateUserState);
    // Optional: Listen to actual storage events for cross-tab sync, though less reliable for same-tab immediate updates
    // window.addEventListener('storage', updateUserState);

    return () => {
      window.removeEventListener('authChange', updateUserState);
      // window.removeEventListener('storage', updateUserState);
    };
  }, []); // Empty dependency array is fine as the event listener handles updates

  const handleLogout = () => {
    LocalStorageService.remove("rentmate_token");
    LocalStorageService.remove("rentmate_user");
    setCurrentUser(null);
    window.dispatchEvent(new CustomEvent('authChange')); // Dispatch event on logout
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex justify-center">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <HomeIcon className="h-8 w-8 text-primary" />
          <span className="font-bold text-lg">RentMate</span>
        </Link>

        <div className="flex items-center space-x-2 md:space-x-3">
          <ThemeToggle />
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-8 w-8">
                    {/* <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name || currentUser.email} /> */}
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser.name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email || "No email available"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <UserCircle2 className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="outline" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 