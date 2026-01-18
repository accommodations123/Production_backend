import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const SectionHeader = ({ title, subtitle, linkText, linkTo }) => (
    <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-8 bg-[#CB2A25] rounded-full"></div>
                <h2 className="text-3xl md:text-4xl font-black text-[#00142E] tracking-tight">{title}</h2>
            </div>
            <p className="text-[#00142E]/70 text-lg pl-5">{subtitle}</p>
        </div>
        {linkText && linkTo && (
            <Link
                to={linkTo}
                className="group flex items-center gap-2 text-[#00142E] font-bold hover:text-[#CB2A25] transition-colors border-b-2 border-transparent hover:border-[#CB2A25] pb-1"
                aria-label={`View ${linkText}`}
            >
                {linkText}
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
        )}
    </div>
);
