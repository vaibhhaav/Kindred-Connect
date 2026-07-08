import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, Sparkles, Users } from 'lucide-react';

const options = [
  {
    key: 'orphanage',
    label: 'Orphanage',
    description: 'Manage and connect children with caring elders for meaningful intergenerational bonds.',
    icon: Heart,
  },
  {
    key: 'elder-care-home',
    label: 'Elder Care Home',
    description: 'Connect elders with young companions for purpose, joy, and lifelong friendships.',
    icon: Users,
  },
];

const features = [
  'AI-powered compatibility matching',
  'Real-time session scheduling',
  'Personality & emotional profiling',
  'Post-session feedback tracking',
];

export default function Home() {
  const navigate = useNavigate();

  const selectInstitution = (institutionType) => {
    localStorage.setItem('institutionType', institutionType);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600/10 px-4 py-1.5 text-sm font-medium text-indigo-700 border border-indigo-100">
            <Sparkles className="h-4 w-4" />
            Kindred Connect
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Building bridges between <span className="text-indigo-700">generations</span>
          </h1>

          <p className="text-lg text-slate-600">
            AI-driven platform connecting orphans and elders for meaningful, life-changing companionship.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => selectInstitution(option.key)}
                className="group cursor-pointer rounded-2xl border border-indigo-100 bg-white p-8 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-700 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{option.label}</h2>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{option.description}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-700 group-hover:text-indigo-900">
                      Get Started <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-14 pt-8 border-t border-indigo-100">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-slate-600 max-w-3xl mx-auto">
            {features.map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                {f}
              </span>
            ))}
          </div>
          <div className="mt-4 text-xs text-slate-500 text-center">
            Choose your institution type to start the workflow.
          </div>
        </div>
      </div>
    </div>
  );
}
