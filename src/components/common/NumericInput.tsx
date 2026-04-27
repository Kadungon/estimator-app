import { Minus, Plus } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function NumericInput({ value, onChange, min = 0, max, step = 1, className, style }: Props) {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    // Synchronize if internal value differs from external prop
    if (parseFloat(inputValue) !== value) {
      setInputValue(value.toString());
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (inputValue === "" || isNaN(parseFloat(inputValue))) {
      setInputValue(min.toString());
      onChange(min);
    } else {
      const parsed = parseFloat(inputValue);
      if (min !== undefined && parsed < min) {
        setInputValue(min.toString());
        onChange(min);
      } else if (max !== undefined && parsed > max) {
        setInputValue(max.toString());
        onChange(max);
      }
    }
  };

  const increment = () => {
    const next = value + step;
    if (max === undefined || next <= max) {
      onChange(next);
      setInputValue(next.toString());
    }
  };

  const decrement = () => {
    const next = value - step;
    if (min === undefined || next >= min) {
      onChange(next);
      setInputValue(next.toString());
    }
  };

  return (
    <div className={`numeric-input-wrapper ${className || ""}`} style={{ display: "flex", alignItems: "center", ...style }}>
      <input
        type="number"
        className="input"
        style={{ 
          textAlign: "center", 
          width: "100%",
          height: 32, 
          padding: "0 8px",
          minWidth: 60,
          fontSize: 13
        }}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={(e) => e.target.select()}
      />
    </div>
  );
}
