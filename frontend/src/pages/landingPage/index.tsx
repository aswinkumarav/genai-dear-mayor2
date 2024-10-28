import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import styled from "styled-components";
import Header from "./Header";
import LandingPage from "./LandingPage";

const Content = styled.main`
  overflow: auto;
  background: #ecf0f3;
  /* padding: var(--bs-content-padding-y) var(--bs-content-padding-x); */
  width: 100%;
  flex-grow: 1;
`;

const Wrapper = styled.div`
  display: flex;
  flex-grow: 1;
`;

function LandingPageIndex() {
  return (
    <Wrapper>
      <Content>
        <Suspense>
          <Header />
          <LandingPage />
          <Outlet />
        </Suspense>
      </Content>
    </Wrapper>
  );
}

export default LandingPageIndex;
