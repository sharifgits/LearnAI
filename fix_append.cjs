const fs = require('fs');
let code = fs.readFileSync('src/components/AiCreator.tsx', 'utf8');

const replacement = `placeholder=""
                  />
                </div>

                <div className="mt-6 flex flex-col gap-4 bg-[#0b0e14] border-2 border-[#212b43] p-4 lg:p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#6e5aff]/20 group-hover:bg-[#6e5aff]/40 transition-colors" />
                  
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <input 
                      type="checkbox"
                      checked={appendToExisting}
                      onChange={(e) => setAppendToExisting(e.target.checked)}
                      className="w-5 h-5 text-[#6e5aff] bg-[#131b2c] border-2 border-[#212b43] rounded-md focus:ring-[#6e5aff] focus:ring-offset-[#0b0e14] cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[#7a86a1] group-hover:text-white transition-colors">Append to existing Topic</span>
                  </label>

                  {appendToExisting && (
                    <div className="space-y-4 pt-2 border-t border-[#212b43]/50">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-[#7a86a1] uppercase tracking-widest ml-1">Select Topic</label>
                          <div className="relative">
                            <select
                              value={selectedTopicId}
                              onChange={(e) => {
                                setSelectedTopicId(e.target.value);
                                setSelectedSubTopicId('');
                              }}
                              className="w-full p-3 pr-10 bg-[#131b2c] border-2 border-[#212b43] rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:border-[#6e5aff] appearance-none cursor-pointer"
                            >
                               <option value="">-- Choose a Topic --</option>
                               {availableTopics.map(topic => (
                                 <option key={topic.id} value={topic.id}>{topic.title}</option>
                               ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#7a86a1]">
                              <ChevronDown size={16} />
                            </div>
                          </div>
                       </div>
                       
                       {selectedTopicId && availableTopics.find(t => t.id === selectedTopicId)?.steps && (
                         <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="text-[9px] font-black text-[#7a86a1] uppercase tracking-widest ml-1">Specific Subtopic (Optional)</label>
                            <div className="relative">
                              <select
                                value={selectedSubTopicId}
                                onChange={(e) => setSelectedSubTopicId(e.target.value)}
                                className="w-full p-3 pr-10 bg-[#131b2c] border-2 border-[#212b43] rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:border-[#6e5aff] appearance-none cursor-pointer"
                              >
                                 <option value="">-- Append as New Subtopic --</option>
                                 {availableTopics.find(t => t.id === selectedTopicId)?.steps.map((step) => (
                                   <option key={step.id} value={step.id}>{step.title}</option>
                                 ))}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#7a86a1]">
                                <ChevronDown size={16} />
                              </div>
                            </div>
                         </div>
                       )}
                    </div>
                  )}
                </div>`;

code = code.replace(/placeholder=""[\s\S]*?\/\>[\s\S]*?\<\/div\>/, replacement);

const targetImport = /import \{(.+?)X \}/;
if (targetImport.test(code)) {
    code = code.replace(targetImport, 'import {$1X, ChevronDown }');
}

fs.writeFileSync('src/components/AiCreator.tsx', code);
