import { parseSupportingContentItem } from "@/components/SupportingContentParser";
import { useState } from "react";

interface Props {
  supportingContent: string[] | { text: string[]; images?: { url: string }[] };
}

export const SupportingContent = ({ supportingContent }: Props) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  const textItems = Array.isArray(supportingContent) 
    ? supportingContent 
    : supportingContent.text;
    
  const imageItems = !Array.isArray(supportingContent) 
    ? supportingContent?.images 
    : [];

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-4">
      {/* Supporting Text Content */}
      {textItems.map((c, ind) => {
        const parsed = parseSupportingContentItem(c);
        return (
          <li
            key={ind}
            className="break-words bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow transition-shadow duration-200"
          >
            <h4 className="text-base font-semibold text-gray-800 mb-2">{parsed.title}</h4>
            
            <div className="text-sm text-gray-600">
              {expandedIndex === ind ? (
                <div dangerouslySetInnerHTML={{ __html: parsed.content }} />
              ) : (
                <>
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: parsed.content.length > 200 
                        ? parsed.content.slice(0, 200) + "..." 
                        : parsed.content 
                    }} 
                  />
                  
                  {parsed.content.length > 200 && (
                    <button
                      className="mt-2 text-blue-600 text-sm font-medium hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(ind);
                      }}
                    >
                      Read More
                    </button>
                  )}
                </>
              )}
              
              {expandedIndex === ind && (
                <button
                  className="mt-2 text-blue-600 text-sm font-medium hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(ind);
                  }}
                >
                  Show Less
                </button>
              )}
            </div>
          </li>
        );
      })}
      
      {/* Supporting Images */}
      {imageItems?.map((img, ind) => (
        <img
          key={ind}
          src={img.url}
          alt={`Supporting content image ${ind + 1}`}
          className="object-contain max-w-full max-h-96 rounded-md shadow-sm"
        />
      ))}
    </ul>
  );
};