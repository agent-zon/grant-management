import React from 'react';
import { 
  MessageCircle, 
  Clock, 
  Zap, 
  X,
  Bot,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface NewChatModalProps {
  onClose: () => void;
  onCreateChat: (type: 'chat' | 'cron' | 'event') => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ onClose, onCreateChat }) => {
  const chatTypes = [
    {
      id: 'chat',
      name: 'Agent Chat',
      description: 'Interactive conversation with AI agent for immediate assistance',
      icon: MessageCircle,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      features: ['Real-time interaction', 'Tool consent requests', 'File operations', 'Data analysis']
    },
    {
      id: 'cron',
      name: 'Scheduled Task',
      description: 'Create automated recurring tasks with cron scheduling',
      icon: Clock,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/20',
      textColor: 'text-green-400',
      features: ['Automated execution', 'Recurring schedules', 'Background processing', 'Consent pre-approval']
    },
    {
      id: 'event',
      name: 'Event Response',
      description: 'Reactive agent triggered by system events and alerts',
      icon: AlertTriangle,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/20',
      textColor: 'text-orange-400',
      features: ['Event-driven', 'Alert responses', 'System monitoring', 'Emergency actions']
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-4xl w-full shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Bot className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Create New Workload</h3>
                <p className="text-sm text-gray-400">Choose the type of AI agent interaction</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-300 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {chatTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => onCreateChat(type.id as 'chat' | 'cron' | 'event')}
                  className="group bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600 hover:border-gray-500 rounded-xl p-6 text-left transition-all duration-200 hover:scale-105"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-3 ${type.bgColor} rounded-lg group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className={`w-6 h-6 ${type.textColor}`} />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-white group-hover:text-blue-300 transition-colors duration-200">
                        {type.name}
                      </h4>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-4 group-hover:text-gray-300 transition-colors duration-200">
                    {type.description}
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Features</p>
                    <ul className="space-y-1">
                      {type.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center space-x-2 text-xs text-gray-400">
                          <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 ${type.bgColor} rounded-full`}>
                      <div className={`w-2 h-2 ${type.textColor.replace('text-', 'bg-')} rounded-full`}></div>
                      <span className={`text-xs ${type.textColor} font-medium`}>
                        {type.id === 'chat' ? 'Interactive' : 
                         type.id === 'cron' ? 'Automated' : 'Reactive'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="mt-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-blue-500/20 rounded">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">Consent Management</p>
                <p className="text-xs text-gray-400">
                  All workload types support granular consent management. Agents will request specific permissions 
                  before accessing tools or data, ensuring you maintain full control over what actions are performed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;