import React from "react";
import Button from "../Button/Button";

interface CardProps {
  title: string;
  description: string;
  link: string;
  linkText?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  description,
  link,
  linkText = "Read more",
}) => {
  return (
    <div className="p-5 bg-white border border-slate-200/80 rounded-xl transition-all duration-200 hover:shadow-md" style={{ boxShadow: "var(--shadow-sm)" }}>
      <a href={link}>
        <h5 className="mb-2 text-xl font-bold tracking-tight text-slate-800 font-display">
          {title}
        </h5>
      </a>
      <p className="mb-4 text-sm text-slate-600 leading-relaxed">
        {description}
      </p>
      <Button
        variant="primary"
        href={link}
        size="sm"
        iconRight={
          <svg
            className="rtl:rotate-180 w-3.5 h-3.5 ms-2"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 10"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M1 5h12m0 0L9 1m4 4L9 9"
            />
          </svg>
        }
      >
        {linkText}
      </Button>
      {/* <a
        href={link}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      >
        {linkText}
        <svg
          className="rtl:rotate-180 w-3.5 h-3.5 ms-2"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 14 10"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M1 5h12m0 0L9 1m4 4L9 9"
          />
        </svg>
      </a> */}
    </div>
  );
};

export default Card;
