"use client";

import { ImportPage } from "@/components/ImportPage";

export default function ImportProductsPage() {
  return (
    <ImportPage
      type="products"
      titleBn="পণ্য ইমপোর্ট"
      titleEn="Import Products"
      sample={`name,sku,sellPrice,purchasePrice,brand
Arduino Uno R3,ARD-UNO,850,650,Arduino
Digital Multimeter,DMM-01,1200,900,Fluke`}
    />
  );
}
