import React from 'react';
import { Sparkles, ArrowLeft, Clock } from 'lucide-react';
import { Card, CardContent } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';

export function ComingSoon({
  title,
  description = 'This subscription module is currently under development and will be available in an upcoming release.',
  features = [],
  backPath,
}) {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-8 md:p-10 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-2 mb-3">
            <Badge variant="primary" className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30">
              <Clock className="w-3 h-3 mr-1" /> Coming Soon
            </Badge>
            <Badge variant="default" className="bg-white/10 text-slate-200 border-white/10">
              Phase 2 Roadmap
            </Badge>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
            {title}
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-xl leading-relaxed">
            {description}
          </p>
        </div>

        <CardContent className="p-6 md:p-8 space-y-6">
          {features.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Planned Capabilities
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 text-sm text-slate-700"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Status: <span className="text-slate-600 font-medium">Design & Architecture in Progress</span>
            </span>

            {backPath && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate(backPath)}
              >
                Return to Overview
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

