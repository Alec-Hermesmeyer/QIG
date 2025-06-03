'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  FileText, 
  Users, 
  TrendingUp, 
  Calendar,
  Settings,
  Eye,
  Hash
} from 'lucide-react';
import { UIComponent, JsonSchemaType } from '@/utils/jsonProcessor';

interface DynamicUIRendererProps {
  components: UIComponent[];
  schemaType: JsonSchemaType;
  title: string;
  description?: string;
}

const DynamicUIRenderer: React.FC<DynamicUIRendererProps> = ({
  components,
  schemaType,
  title,
  description
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const getSchemaIcon = (schemaType: JsonSchemaType) => {
    switch (schemaType) {
      case 'company_data':
        return <Users className="h-6 w-6" />;
      case 'dashboard_config':
        return <BarChart3 className="h-6 w-6" />;
      case 'form_schema':
        return <FileText className="h-6 w-6" />;
      case 'chart_config':
        return <TrendingUp className="h-6 w-6" />;
      case 'table_config':
        return <Calendar className="h-6 w-6" />;
      case 'navigation_menu':
        return <Settings className="h-6 w-6" />;
      case 'user_profile':
        return <Users className="h-6 w-6" />;
      default:
        return <Hash className="h-6 w-6" />;
    }
  };

  const getSchemaColor = (schemaType: JsonSchemaType) => {
    switch (schemaType) {
      case 'company_data':
        return 'bg-blue-100 text-blue-800';
      case 'dashboard_config':
        return 'bg-purple-100 text-purple-800';
      case 'form_schema':
        return 'bg-green-100 text-green-800';
      case 'chart_config':
        return 'bg-orange-100 text-orange-800';
      case 'table_config':
        return 'bg-indigo-100 text-indigo-800';
      case 'navigation_menu':
        return 'bg-gray-100 text-gray-800';
      case 'user_profile':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Schema Header */}
      <motion.div variants={itemVariants}>
        <Card className="border-2 border-dashed border-gray-300">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getSchemaColor(schemaType).replace('text-', 'bg-').replace('800', '50')}`}>
                {getSchemaIcon(schemaType)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-2xl">{title}</CardTitle>
                  <Badge variant="secondary" className={getSchemaColor(schemaType)}>
                    {schemaType.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                {description && (
                  <CardDescription className="mt-1 text-lg">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Dynamic Components Grid */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {components.map((component) => (
          <motion.div key={component.id} variants={itemVariants}>
            {renderComponent(component)}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

const renderComponent = (component: UIComponent): React.ReactNode => {
  switch (component.type) {
    case 'card':
      return <CardComponent component={component} />;
    case 'table':
      return <TableComponent component={component} />;
    case 'list':
      return <ListComponent component={component} />;
    case 'form':
      return <FormComponent component={component} />;
    case 'chart':
      return <ChartComponent component={component} />;
    case 'metric':
      return <MetricComponent component={component} />;
    case 'grid':
      return <GridComponent component={component} />;
    default:
      return <DefaultComponent component={component} />;
  }
};

const CardComponent: React.FC<{ component: UIComponent }> = ({ component }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <FileText className="h-5 w-5" />
        <span>{component.title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {Object.entries(component.data).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="font-medium text-gray-600 capitalize">
              {key.replace(/_/g, ' ')}:
            </span>
            <span className="text-gray-900">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const TableComponent: React.FC<{ component: UIComponent }> = ({ component }) => {
  const data = Array.isArray(component.data) ? component.data : 
               (component.data.rows ? component.data.rows : []);
  const columns = component.data.columns || 
                 (data.length > 0 ? Object.keys(data[0]) : []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>{component.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((column: string) => (
                  <th key={column} className="text-left p-2 font-medium">
                    {column.replace(/_/g, ' ').toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 5).map((row: any, index: number) => (
                <tr key={index} className="border-b border-gray-100">
                  {columns.map((column: string) => (
                    <td key={column} className="p-2">
                      {typeof row[column] === 'object' 
                        ? JSON.stringify(row[column]) 
                        : String(row[column] || '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 5 && (
            <p className="text-sm text-gray-500 mt-2">
              Showing 5 of {data.length} rows
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ListComponent: React.FC<{ component: UIComponent }> = ({ component }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Eye className="h-5 w-5" />
        <span>{component.title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="space-y-2">
        {Array.isArray(component.data) ? (
          component.data.slice(0, 10).map((item, index) => (
            <li key={index} className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>
                {typeof item === 'object' ? (
                  <div className="text-sm">
                    {Object.entries(item).map(([key, value]) => (
                      <div key={key}>
                        <strong>{key}:</strong> {String(value)}
                      </div>
                    ))}
                  </div>
                ) : (
                  String(item)
                )}
              </span>
            </li>
          ))
        ) : (
          <li className="text-gray-500">No items to display</li>
        )}
      </ul>
      {Array.isArray(component.data) && component.data.length > 10 && (
        <p className="text-sm text-gray-500 mt-2">
          Showing 10 of {component.data.length} items
        </p>
      )}
    </CardContent>
  </Card>
);

const FormComponent: React.FC<{ component: UIComponent }> = ({ component }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <FileText className="h-5 w-5" />
        <span>{component.title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {Array.isArray(component.data) ? (
          component.data.map((field: any, index: number) => (
            <div key={index} className="space-y-1">
              <label className="text-sm font-medium">
                {field.label || field.name || `Field ${index + 1}`}
                {field.required && <span className="text-red-500">*</span>}
              </label>
              <div className="p-2 border rounded bg-gray-50 text-sm text-gray-600">
                Type: {field.type || 'text'} | 
                {field.placeholder && ` Placeholder: "${field.placeholder}"`}
                {field.validation && ` | Validation: ${field.validation}`}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No form fields defined</p>
        )}
      </div>
    </CardContent>
  </Card>
);

const ChartComponent: React.FC<{ component: UIComponent }> = ({ component }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <TrendingUp className="h-5 w-5" />
        <span>{component.title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded-lg text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">Chart Preview</p>
          <p className="text-xs text-gray-500">
            Type: {component.data.type || 'Unknown'}
          </p>
        </div>
        <div className="text-sm space-y-2">
          {component.data.data && (
            <div>
              <strong>Data Points:</strong> {
                Array.isArray(component.data.data) 
                  ? component.data.data.length 
                  : 'Complex dataset'
              }
            </div>
          )}
          {component.data.options && (
            <div>
              <strong>Configuration:</strong> Custom options defined
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const MetricComponent: React.FC<{ component: UIComponent }> = ({ component }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Hash className="h-5 w-5" />
        <span>{component.title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-center">
        <div className="text-4xl font-bold text-blue-600 mb-2">
          {typeof component.data === 'number' 
            ? component.data.toLocaleString() 
            : String(component.data)}
        </div>
        <p className="text-sm text-gray-500">Metric Value</p>
      </div>
    </CardContent>
  </Card>
);

const GridComponent: React.FC<{ component: UIComponent }> = ({ component }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <BarChart3 className="h-5 w-5" />
        <span>{component.title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(component.data).map(([key, value]) => (
          <div key={key} className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-600 uppercase mb-1">
              {key.replace(/_/g, ' ')}
            </div>
            <div className="text-sm">
              {typeof value === 'string' && value.startsWith('#') ? (
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded border" 
                    style={{ backgroundColor: value }}
                  ></div>
                  <span className="font-mono">{value}</span>
                </div>
              ) : (
                String(value)
              )}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const DefaultComponent: React.FC<{ component: UIComponent }> = ({ component }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle>{component.title}</CardTitle>
    </CardHeader>
    <CardContent>
      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
        {JSON.stringify(component.data, null, 2)}
      </pre>
    </CardContent>
  </Card>
);

export default DynamicUIRenderer; 