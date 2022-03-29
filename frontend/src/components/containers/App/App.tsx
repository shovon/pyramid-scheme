import { useState } from "react";
import logo from "./logo.svg";
import styled from "styled-components";
import { render } from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
