import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  src: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ src }) => {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { t } = useTranslation();

  // Remove anchor links to avoid broken links
  const removeAnchorLinks = (markdown: string) => {
    const anchorLinksRegex = /\[.*?\]\(#.*?\)/g;
    return markdown.replace(anchorLinksRegex, "");
  };

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        const response = await fetch(src);

        if (!response.ok) {
          throw new Error("Failed loading markdown file.");
        }

        let markdownText = await response.text();
        markdownText = removeAnchorLinks(markdownText);
        setContent(markdownText);
      } catch (error: any) {
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkdown();
  }, [src]);

  return (
    <div className="bg-white shadow-md rounded-lg my-5 p-6 w-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-800 p-4 rounded-lg">
          <p>{error.message}</p>
          <a href={src} download className="text-blue-600 underline">
            {t("Download the file")}
          </a>
        </div>
      ) : (
        <div>
          <a
            href={src}
            download
            className="float-right text-gray-700 hover:text-gray-900 transition"
            title={t("tooltips.save")}
            aria-label={t("tooltips.save")}
          >
            💾
          </a>
          <div className="prose max-w-none text-gray-800">
            <ReactMarkdown
              children={content}
              remarkPlugins={[remarkGfm]}
            />
          </div>
        </div>
      )}
    </div>
  );
};
