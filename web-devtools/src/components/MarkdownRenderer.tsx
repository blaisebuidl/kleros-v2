import React from "react";
import styled from "styled-components";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const MarkdownContainer = styled.div`
  font-size: 14px;
  line-height: 1.6;

  > *:first-child {
    margin-top: 0;
  }

  > *:last-child {
    margin-bottom: 0;
  }

  pre {
    background-color: ${({ theme }) => theme.klerosUIComponentsLightBackground};
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;
  }

  code {
    background-color: ${({ theme }) => theme.klerosUIComponentsLightBackground};
    padding: 2px 4px;
    border-radius: 4px;
    font-family: "Fira Code", monospace;
  }

  pre code {
    background-color: transparent;
    padding: 0;
  }

  blockquote {
    border-left: 4px solid ${({ theme }) => theme.klerosUIComponentsSecondaryPurple};
    margin: 16px 0;
    padding-left: 16px;
    color: ${({ theme }) => theme.klerosUIComponentsSecondaryText};
  }

  ul,
  ol {
    padding-left: 20px;
  }

  input[type="checkbox"] {
    margin-right: 8px;
    margin-top: 4px;
    cursor: default;
    vertical-align: top;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
    margin: 16px 0 8px 0;
    line-height: 1.3;
  }

  h1 {
    font-size: 1.75em;
    font-weight: 700;
  }
  h2 {
    font-size: 1.5em;
    font-weight: 600;
  }
  h3 {
    font-size: 1.25em;
    font-weight: 600;
  }
  h4 {
    font-size: 1.125em;
    font-weight: 600;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
    border: 1px solid ${({ theme }) => theme.klerosUIComponentsStroke};
  }

  th,
  td {
    border: 1px solid ${({ theme }) => theme.klerosUIComponentsStroke};
    padding: 8px 12px;
    text-align: left;
  }

  th {
    background-color: ${({ theme }) => theme.klerosUIComponentsLightBackground};
    color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
    font-weight: 600;
  }

  a {
    color: ${({ theme }) => theme.klerosUIComponentsSecondaryPurple};
    text-decoration: underline;
  }

  a:hover {
    opacity: 0.8;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  hr {
    border: none;
    border-top: 1px solid ${({ theme }) => theme.klerosUIComponentsStroke};
    margin: 16px 0;
  }
`;

interface IMarkdownRenderer {
  content: string;
  className?: string;
}

const sanitizeSchema = {
  tagNames: [
    "p",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "input",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "del",
    "s",
    "code",
    "pre",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "blockquote",
    "details",
    "summary",
  ],
  attributes: {
    "*": ["className"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    input: ["type", "checked", "disabled"],
    th: ["scope", "colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    details: ["open"],
  },
};

const MarkdownRenderer: React.FC<IMarkdownRenderer> = ({ content, className }) => {
  if (!content || content.trim() === "") {
    return null;
  }

  return (
    <MarkdownContainer className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}>
        {content}
      </ReactMarkdown>
    </MarkdownContainer>
  );
};

export default MarkdownRenderer;
