import React from "react";
import aiWriter from "../../../assets/aiwriter.webp";
import { Link } from "react-router-dom";

const StartWritingComponent = () => {
  return (
    <section className="mb-24 mx-5">
      <div className="relative group max-w-6xl mx-auto overflow-hidden rounded-[2.5rem] bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-500 hover:border-blue-500/20">
        {/* Top-weighted border highlight */}
        <div className="absolute inset-0 border-t border-white/10 rounded-[2.5rem] pointer-events-none"></div>

        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -z-10 group-hover:bg-blue-500/20 transition-colors duration-500"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -z-10"></div>
        
        <div className="px-8 py-16 sm:px-12 lg:px-24 flex flex-col md:flex-row items-center justify-between gap-16">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">
              Ready to <br className="hidden md:block" /> Start Writing?
            </h2>
            <p className="text-lg md:text-xl text-gray-300/80 mb-10 leading-relaxed max-w-lg mx-auto md:mx-0">
              Join thousands of writers who are already creating amazing content
              with our AI-powered platform.
            </p>
            <Link to="/stories">
              <button className="!rounded-button inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-10 py-4 text-lg font-bold tracking-wide transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 cursor-pointer">
                GET STARTED FREE
                <i className="fa-solid fa-wand-magic-sparkles ml-3"></i>
              </button>
            </Link>
          </div>
          
          <div className="flex-1 flex justify-center md:justify-end">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl -z-10 opacity-60 group-hover:opacity-100 transition-opacity duration-700"></div>
              <img
                src={aiWriter}
                alt="Writing Illustration"
                className="w-full max-w-sm lg:max-w-md object-contain drop-shadow-2xl transition-transform duration-1000 group-hover:scale-[1.03]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StartWritingComponent;
