"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

// Predefined Tailwind colors
const colorOptions = [
  { name: "Red", value: "red-500" },
  { name: "Blue", value: "blue-600" },
  { name: "Green", value: "green-600" },
  { name: "Purple", value: "purple-600" },
  { name: "Orange", value: "orange-500" },
  { name: "Teal", value: "teal-500" },
  { name: "Yellow", value: "yellow-500" },
  { name: "Indigo", value: "indigo-600" },
  { name: "Pink", value: "pink-500" },
  { name: "Cyan", value: "cyan-500" }
];

export default function QuickThemePage() {
  const { user, organization } = useAuth();
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [customColor, setCustomColor] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [orgData, setOrgData] = useState<any>(null);
  
  // Fetch organization data directly from the database
  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const response = await fetch("/api/debug/organization");
        const data = await response.json();
        setOrgData(data);
        console.log("Organization data from API:", data);
      } catch (error) {
        console.error("Error fetching organization data:", error);
      }
    };
    
    fetchOrgData();
  }, []);
  
  const updateTheme = async (color: string) => {
    if (!organization?.id) {
      setStatus("No organization found");
      return;
    }
    
    try {
      setStatus(`Updating theme to ${color}...`);
      
      // First try using the API
      const response = await fetch("/api/debug/update-theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgId: organization.id,
          themeColor: color,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStatus(`Updated successfully via API to ${color}`);
      } else {
        // Fallback to direct Supabase update
        const { error } = await supabase
          .from("organizations")
          .update({ theme_color: color })
          .eq("id", organization.id);
          
        if (error) {
          throw error;
        }
        
        setStatus(`Updated successfully via direct DB to ${color}`);
      }
      
      // Reload page after 1.5 seconds to see changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error("Error updating theme:", error);
      setStatus(`Error: ${error}`);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Organization Theme Color Utility</h1>
        
        {/* Organization Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="font-semibold mb-2">Current Organization Data:</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
            {organization ? JSON.stringify(organization, null, 2) : "Loading..."}
          </pre>
          
          <h2 className="font-semibold mt-4 mb-2">API Organization Data:</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
            {orgData ? JSON.stringify(orgData, null, 2) : "Loading..."}
          </pre>
        </div>
        
        {/* Predefined Colors */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Select a Predefined Color</h2>
          <div className="grid grid-cols-5 gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                className={`h-10 rounded-md border-2 ${
                  selectedColor === color.value ? "border-black" : "border-transparent"
                }`}
                style={{ backgroundColor: `var(--${color.value.split("-")[0]}-${color.value.split("-")[1]})` }}
                onClick={() => {
                  setSelectedColor(color.value);
                  setCustomColor("");
                }}
              />
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2 mt-2 text-xs text-center">
            {colorOptions.map((color) => (
              <div key={`label-${color.value}`}>{color.name}</div>
            ))}
          </div>
        </div>
        
        {/* Custom Color */}
        <div className="mb-8">
          <Label htmlFor="customColor" className="text-lg font-semibold mb-3 block">
            Or Enter Custom Color Value
          </Label>
          <div className="flex gap-2">
            <Input
              id="customColor"
              placeholder="e.g., red-500, blue-600, etc."
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                setSelectedColor("");
              }}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter a Tailwind color like "blue-600" or a custom gradient like "from-blue-500 to-blue-700"
          </p>
        </div>
        
        {/* Apply Button */}
        <div className="flex flex-col gap-4">
          <Button
            onClick={() => updateTheme(customColor || selectedColor)}
            disabled={!customColor && !selectedColor}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Apply Theme Color
          </Button>
          
          <div className="text-sm">
            <div className="font-semibold">Status:</div>
            <div className="text-gray-600">{status || "Ready to update"}</div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Link href="/landing" className="flex items-center text-sm text-blue-600 hover:text-blue-800">
              Back to Landing Page <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 