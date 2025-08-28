@@ .. @@
              <div className="flex space-x-4 mt-4">
                {[
                  { id: 'overview', name: 'Overview', icon: Activity },
                  { id: 'prompt', name: 'Prompt', icon: FileText },
-                  { id: 'scheduler', name: 'Scheduler', icon: Clock },
                  { id: 'consent', name: 'Consent', icon: Shield },
-                  { id: 'logs', name: 'Logs', icon: FileText },
-                  { id: '
                  )
                }
                )
                }metrics', name: 'Metrics', icon: Activity }
+                  { id: 'logs', name: 'Logs', icon: FileText }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (