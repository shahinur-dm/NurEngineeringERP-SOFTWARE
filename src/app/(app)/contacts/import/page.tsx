"use client";

import { ImportPage } from "@/components/ImportPage";

export default function ImportContactsPage() {
  return (
    <ImportPage
      type="customers"
      titleBn="যোগাযোগ ইমপোর্ট"
      titleEn="Import Contacts"
      sample={`name,mobile,email,address
Karim Electronics,01710000001,karim@example.com,Dhaka
Lab Supplies BD,01820000002,,Chittagong`}
    />
  );
}
