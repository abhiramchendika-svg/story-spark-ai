import { useState } from "react";
import {
  UseFormRegister,
  FieldValues,
  Path,
  RegisterOptions,
  FieldError,
} from "react-hook-form";

interface SSInputProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  type?: string;
  placeholder?: string;
  required?: boolean;
  icon?: string;
  register: UseFormRegister<T>;
  validation?: RegisterOptions<T>;
  error?: FieldError;
  autoComplete?: string;
  autoFocus?: boolean;
}

const SSInput = <T extends FieldValues>({
  label,
  name,
  type = "text",
  placeholder,
  required,
  icon,
  register,
  validation,
  error,
  autoComplete,
  autoFocus,
}: SSInputProps<T>) => {
  const [showLocalPassword, setShowLocalPassword] = useState(false);





  const inputType = type === "password" ? (showPassword ? "text" : "password") : type;

  return (

    <div className="w-full min-w-0">
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">

        {label}
      </label>
      <div className="relative w-full">
        {/* Left Icon */}
        {icon && (


          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 pointer-events-none">





            <i className={icon}></i>
          </span>
        )}






        {/* The SINGLE Corrected Input Field with Bulletproof Padding */}

        <input
          type={inputType}
          id={name}



          className={`w-full h-[52px] box-border text-base text-gray-900 dark:text-white bg-gray-100 dark:bg-[#131c2f] border rounded-2xl placeholder:text-gray-500 focus:outline-none transition-all ${error
              ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-black/10 dark:border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            }`}
          style={{
            paddingLeft: icon ? "3.5rem" : "1.25rem",
            paddingRight: type === "password" ? "3rem" : "1.25rem"
          }}



          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          {...register(name, validation)}

          className={`w-full h-11 block box-border rounded-xl border bg-transparent text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${

            icon ? "pl-10" : "px-4"
          } ${type === "password" ? "pr-10" : "pr-4"} ${
            error
              ? "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900 dark:text-rose-200"
              : "border-slate-200 dark:border-slate-700 text-gray-900 dark:text-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
          }`}

        />




        {/* Right Password Eye Toggle */}

        {type === "password" && (

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}

            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}



          >
            <i className={showLocalPassword ? "fi fi-rr-eye" : "fi fi-rr-eye-crossed"}></i>
          </button>
        )}


      </div>

      {/* Error Message */}
      {error && (



        <p className="text-red-500 text-sm mt-2">{error.message}</p>

      )}





    </div>
  );
};

export default SSInput;
