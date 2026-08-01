import React from 'react';
import Hero from '../../p-components/hero';
import ImageGallery from '../../p-components/image';
import Footer from '../../components/footer';
export default function PhotoGallery() {
  return (
    <div className="w-full flex flex-col">
      <Hero />
      <ImageGallery />
      <Footer />
    </div>
  );
}