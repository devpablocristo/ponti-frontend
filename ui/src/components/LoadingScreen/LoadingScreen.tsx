import * as React from "react";

type LoadingProps = {
  title?: string[];
  description?: string[];
};

export default function LoadingScreen({
  title = [""],
  description = [""],
}: LoadingProps) {
  const renderText = (text: string[]) => {
    return text.map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < title.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto px-4 animate-fade-in">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-custom-btn animate-spinner"
              viewBox="0 0 50 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="25"
                cy="25"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="90 150"
              />
            </svg>
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-800 font-display tracking-tight">
              {renderText(title)}
            </h1>
            <p className="text-base text-slate-500">{renderText(description)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
