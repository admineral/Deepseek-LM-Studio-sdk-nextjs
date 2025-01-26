import React, { useState } from 'react';

interface WeatherResponse {
  temperature: string;
  unit: string;
  conditions: string;
}

interface WeatherResponseFormProps {
  onSubmit: (responseData: string) => void;
  onCancel: () => void;
  location: string;
}

export function WeatherResponseForm({ onSubmit, onCancel, location }: WeatherResponseFormProps) {
  const [responseType, setResponseType] = useState<'weather' | 'clarify'>('weather');
  const [weatherResponse, setWeatherResponse] = useState<WeatherResponse>({
    temperature: '19',
    unit: 'C',
    conditions: 'clear'
  });
  const [clarifyQuestion, setClarifyQuestion] = useState('Could you specify which city you are asking about?');

  const canSubmitResponse = () => {
    if (responseType === 'weather') {
      return weatherResponse.temperature && weatherResponse.unit && weatherResponse.conditions;
    }
    return clarifyQuestion.trim() !== '';
  };

  const handleSubmit = () => {
    const responseData = responseType === 'weather' 
      ? JSON.stringify(weatherResponse)
      : JSON.stringify({
          function: 'clarify',
          parameters: { question: clarifyQuestion }
        });
    onSubmit(responseData);
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2">
        <div className="bg-[#1e1e1e] text-white rounded-lg px-4 py-3 font-mono text-sm">
          <div className="flex justify-between items-start">
            <div>
              get_weather({'\n'}
              {'  '}"location": "{location}",{'\n'}
              {'  '}"unit": "c"{'\n'}
              {')'}
            </div>
            <button 
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="bg-[#1e1e1e] text-gray-400 rounded-lg px-4 py-3 font-mono text-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="uppercase">RESPONSE</div>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setResponseType('weather')}
                className={`px-2 py-1 rounded ${
                  responseType === 'weather' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-[#2d2d2d] hover:bg-[#3d3d3d]'
                }`}
              >
                Weather
              </button>
              <button
                type="button"
                onClick={() => setResponseType('clarify')}
                className={`px-2 py-1 rounded ${
                  responseType === 'clarify' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-[#2d2d2d] hover:bg-[#3d3d3d]'
                }`}
              >
                Clarify
              </button>
            </div>
          </div>

          {responseType === 'weather' ? (
            <div className="space-y-2">
              <div>
                <label className="block text-xs mb-1">Temperature</label>
                <input
                  type="number"
                  value={weatherResponse.temperature}
                  onChange={(e) => setWeatherResponse(prev => ({ ...prev, temperature: e.target.value }))}
                  placeholder="19"
                  className="w-full bg-[#2d2d2d] text-white rounded px-3 py-2 
                           focus:outline-none focus:ring-1 focus:ring-blue-500
                           placeholder-gray-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Unit</label>
                <select
                  value={weatherResponse.unit}
                  onChange={(e) => setWeatherResponse(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full bg-[#2d2d2d] text-white rounded px-3 py-2 
                           focus:outline-none focus:ring-1 focus:ring-blue-500
                           font-mono text-sm"
                >
                  <option value="C">C</option>
                  <option value="F">F</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Conditions</label>
                <input
                  type="text"
                  value={weatherResponse.conditions}
                  onChange={(e) => setWeatherResponse(prev => ({ ...prev, conditions: e.target.value }))}
                  placeholder="clear"
                  className="w-full bg-[#2d2d2d] text-white rounded px-3 py-2 
                           focus:outline-none focus:ring-1 focus:ring-blue-500
                           placeholder-gray-500 font-mono text-sm"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs mb-1">Clarification Question</label>
              <input
                type="text"
                value={clarifyQuestion}
                onChange={(e) => setClarifyQuestion(e.target.value)}
                placeholder="Could you specify which city you're asking about?"
                className="w-full bg-[#2d2d2d] text-white rounded px-3 py-2 
                         focus:outline-none focus:ring-1 focus:ring-blue-500
                         placeholder-gray-500 font-mono text-sm"
              />
            </div>
          )}

          <div className="flex justify-between items-center mt-3">
            <div className="text-xs text-gray-500">
              {responseType === 'weather' ? (
                <>
                  Format: {'{'}
                  <span className="text-blue-400">"temperature"</span>: number,{' '}
                  <span className="text-blue-400">"unit"</span>: string,{' '}
                  <span className="text-blue-400">"conditions"</span>: string
                  {'}'}
                </>
              ) : (
                <>
                  Format: {'{'}
                  <span className="text-blue-400">"function"</span>: "clarify",{' '}
                  <span className="text-blue-400">"parameters"</span>: {'{ "question": string }'}
                  {'}'}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmitResponse()}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                       disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              Send Response
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 