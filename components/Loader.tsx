import React from 'react';

const Loader = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
      <div className="flex h-20 w-20 animate-spin items-center justify-center rounded-full border-4 border-t-4 border-gray-200 border-t-blue-500"></div>
    </div>
  );
};

export default Loader;
