"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { AxiosError } from "axios";
import LocalStorageService from "@/lib/localStorage";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const storeToken = (token: string) => {
  if (typeof window !== "undefined") {
    LocalStorageService.save("rentmate_token", token);
  }
};

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
});

type LoginFormValues = z.infer<typeof formSchema>;

interface LoginFormProps {
  onLoginSuccess?: () => void; // Optional callback for successful login
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post("/auth/login", values);
      const data = response.data;

      if (data.accessToken && data.user) {
        storeToken(data.accessToken);
        LocalStorageService.save("rentmate_user", JSON.stringify(data.user));
        window.dispatchEvent(new CustomEvent('authChange'));
        toast({
          title: "Login Successful!",
          description: "Welcome back! You are now logged in.",
        });
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          router.push("/dashboard");
        }
      } else {
        throw new Error("Login failed: No access token or user data received.");
      }
    } catch (error) {
      let errorMessage = "An unexpected error occurred.";
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<any>;
        if (
          axiosError.response &&
          axiosError.response.data &&
          axiosError.response.data.message
        ) {
          errorMessage = Array.isArray(axiosError.response.data.message)
            ? axiosError.response.data.message.join(", ")
            : axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </Form>
  );
}
