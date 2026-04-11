"""
LVMH Power BI Ticket Auto-Classification
EY Data Team - Module 1: Intelligent Ticket Enrichment
Using CrewAI multi-agent architecture
"""

import os
from dotenv import load_dotenv
load_dotenv()
import json
from typing import Optional, Type, Any
from crewai import Agent, Task, Crew, Process
from crewai.tools import BaseTool
from pydantic import BaseModel, Field, ConfigDict
import random


# ─────────────────────────────────────────────
#  DOMAIN TAXONOMY  (extrait des 10 000 tickets)
# ─────────────────────────────────────────────
TAXONOMY = {
    "categories": ["Incident", "Demande", "Assistance", "Changement applicatif", "Problème applicatif"],
    "sous_categories": ["Datas", "Accès", "Logiciel", "Application", "Production", "Evolution", "Sécurité", "Matériel", "Bug"],
    "services": [
        "PCD - Retail Scorecard", "O365-PowerBI", "PCD - Client Quest Main Reports",
        "Self BI", "PowerBI capacity overloaded", "BI Metrics", "Guerlain - CRM",
        "Guerlain - NewViz", "eCoTool#2 - On Promised Delivery", "eCoTool#2 - OnPremiseDelivery",
        "Beauty Intelligence Sell Out", "Guerlain - Client Retail Performance",
        "PCD - Dior Connect (Clienteling)", "PCD - CRM - ClientQuest",
        "Guerlain - Retail Scorecard", "Datahub Supply Chain",
        "Beauty Intelligence Sell In", "PCD - Sell in Activity", "Guerlain - Media App",
        "DEALS#1 Direct Purchase", "MFK - CRM Central", "BULY - Retail Scorecard light (Ipos)"
    ],
    "impacts": ["1 - Majeur", "2 - Modéré", "3 - Mineur", "4 - Utilisateur"],
    "urgences": ["1 - Elevée", "2 - Moyenne", "3 - Faible"],
}

# ─────────────────────────────────────────────
#  SCHEMAS
# ─────────────────────────────────────────────

class TicketInput(BaseModel):
    numero: str
    breve_description: str
    description: Optional[str] = ""
    entreprise: Optional[str] = ""

class ClassificationResult(BaseModel):
    numero: str
    categorie: str
    sous_categorie: str
    service: str
    impact: str
    urgence: str
    priorite_calculee: str
    confidence: float
    reasoning: str


# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

def get_few_shot_examples(query: str = "") -> str:
    """Charge des exemples réels les plus pertinents par rapport au ticket actuel."""
    file_path = "data/processed/few_shot_examples.json"
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            all_examples = json.load(f)
        
        if not query:
            selected = random.sample(all_examples, min(2, len(all_examples)))
        else:
            # Score de similarité basique basé sur l'intersection de mots
            query_words = set(query.lower().split())
            scored_examples = []
            for ex in all_examples:
                ex_words = set(ex.get("breve_description", "").lower().split())
                score = len(query_words.intersection(ex_words))
                scored_examples.append((score, ex))
            
            # Trier par score décroissant et prendre les meilleurs
            scored_examples.sort(key=lambda x: x[0], reverse=True)
            selected = [ex for score, ex in scored_examples[:2]]

        return "\n".join([f"- Titre: {ex['breve_description']}\n  Labels: {ex['labels']}" for ex in selected])
    except:
        return "- Titre: Accès Power BI refusé\n  Labels: {'categorie': 'Demande', 'sous_categorie': 'Accès', 'service': 'O365-PowerBI', 'impact': '4 - Utilisateur', 'urgence': '3 - Faible'}"

# ─────────────────────────────────────────────
#  TOOL SCHEMAS
# ─────────────────────────────────────────────

class PriorityCalculatorInput(BaseModel):
    """Schema pour priority_calculator."""
    model_config = ConfigDict(extra='allow')
    impact: str = Field(..., description="Impact du ticket (ex: '1 - Majeur').")
    urgence: str = Field(..., description="Urgence du ticket (ex: '1 - Elevée').")


# ─────────────────────────────────────────────
#  TOOLS
# ─────────────────────────────────────────────


class PriorityCalculatorTool(BaseTool):
    name: str = "priority_calculator"
    description: str = "Calcule la priorité finale d'un ticket selon la matrice Impact x Urgence de ServiceNow."
    args_schema: Type[BaseModel] = PriorityCalculatorInput

    def _run(self, impact: str, urgence: str, **kwargs: Any) -> str:
        matrix = {
            ("1 - Majeur",    "1 - Elevée"):  "1 - Critique",
            ("1 - Majeur",    "2 - Moyenne"): "2 - Majeure",
            ("1 - Majeur",    "3 - Faible"):  "2 - Majeure",
            ("2 - Modéré",    "1 - Elevée"):  "2 - Majeure",
            ("2 - Modéré",    "2 - Moyenne"): "3 - Mineure",
            ("2 - Modéré",    "3 - Faible"):  "3 - Mineure",
            ("3 - Mineur",    "1 - Elevée"):  "3 - Mineure",
            ("3 - Mineur",    "2 - Moyenne"): "3 - Mineure",
            ("3 - Mineur",    "3 - Faible"):  "4 - Standard",
            ("4 - Utilisateur","1 - Elevée"): "3 - Mineure",
            ("4 - Utilisateur","2 - Moyenne"): "4 - Standard",
            ("4 - Utilisateur","3 - Faible"):  "4 - Standard",
        }
        key = (impact.strip(), urgence.strip())
        result = matrix.get(key, "4 - Standard")
        return json.dumps({"priorite": result, "impact": impact, "urgence": urgence})


# ─────────────────────────────────────────────
#  AGENTS
# ─────────────────────────────────────────────

def build_crew(llm_model: str = "groq/llama-3.1-8b-instant") -> tuple:
    """Construit et retourne le Crew complet."""

    priority_tool = PriorityCalculatorTool()

    # --- Agent 1 : Analyste de ticket ---
    ticket_analyst = Agent(
        role="Analyste IT ServiceNow",
        goal="Extraire l'intention du ticket et identifier le service concerné.",
        backstory="Expert en tickets Power BI LVMH.",
        tools=[],
        llm=llm_model,
        verbose=True,
    )

    # --- Agent 2 : Classificateur ---
    classifier = Agent(
        role="Classificateur ITIL",
        goal="Assigner des labels de taxonomie et calculer la priorité.",
        backstory="Expert en taxonomie ITIL. Utilise l'outil priority_calculator.",
        tools=[priority_tool],
        llm=llm_model,
        verbose=True,
    )

    # --- Agent 3 : Validateur Qualité ---
    qa_validator = Agent(
        role="Auditeur Qualité",
        goal="Valider la cohérence et produire le JSON final.",
        backstory="Dernier rempart garantissant la structure JSON.",
        tools=[priority_tool],
        llm=llm_model,
        verbose=True,
    )

    return ticket_analyst, classifier, qa_validator


def classify_ticket(ticket: TicketInput, llm_model: str = "groq/llama-3.1-8b-instant") -> ClassificationResult:
    """
    Classifie un ticket avec le pipeline CrewAI 3 agents.
    
    Args:
        ticket: TicketInput avec numéro, brève description, description, entreprise
        llm_model: modèle LLM à utiliser (gpt-4o recommandé)
    
    Returns:
        ClassificationResult avec tous les champs classifiés
    """
    analyst, classifier, validator = build_crew(llm_model)

    ticket_context = f"""
NUMÉRO : {ticket.numero} | ENTREPRISE : {ticket.entreprise}
TITRE : {ticket.breve_description}
DESC : {ticket.description[:1000] if ticket.description else 'N/A'}
"""

    examples = get_few_shot_examples(ticket.breve_description)

    # Task 1 : Analyse
    task_analyze = Task(
        description=f"""
Analyse ce ticket ServiceNow :
{ticket_context}

Identifie : Nature du problème, Service Power BI, Maison LVMH, Urgence et Impact.

Voici des exemples de tickets similaires pour t'aider :
{examples}
""",
        expected_output="Analyse concise (nature, service, urgence, impact).",
        agent=analyst,
    )

    # Task 2 : Classification
    task_classify = Task(
        description=f"""
Assigne les champs suivants pour le ticket {ticket.numero}.
TAXONOMIE AUTORISÉE :
{json.dumps(TAXONOMY, indent=2)}

Règles :
- Si "accès", "droits" → Sous-catégorie = Accès
- Si "données manquantes" → Sous-catégorie = Datas
- Si plusieurs utilisateurs bloqués → Impact ≥ 2 - Modéré

Action : Utilise l'outil priority_calculator pour la Priorité finale.
""",
        expected_output="Labels de classification et priorité avec raisonnement.",
        agent=classifier,
        context=[task_analyze],
    )

    # Task 3 : Validation & JSON final
    task_validate = Task(
        description=f"""
Valide la classification finale et produis le JSON final.
Vérifie la cohérence Impact/Urgence/Priorité (re-utilise priority_calculator si besoin).

Produis UNIQUEMENT ce JSON :
{{
  "numero": "{ticket.numero}",
  "categorie": "...",
  "sous_categorie": "...",
  "service": "...",
  "impact": "...",
  "urgence": "...",
  "priorite_calculee": "valeur textuelle",
  "confidence": 0.0,
  "reasoning": "..."
}}

Le champ "confidence" est entre 0.0 et 1.0 (1.0 = très certain).
Le champ "reasoning" résume en 1-2 phrases pourquoi ces classifications.
""",
        expected_output="JSON valide et structuré de la classification finale du ticket.",
        agent=validator,
        context=[task_classify],
        output_pydantic=ClassificationResult,
    )

    crew = Crew(
        agents=[analyst, classifier, validator],
        tasks=[task_analyze, task_classify, task_validate],
        process=Process.sequential,
        verbose=True,
    )

    result = crew.kickoff()
    return result.pydantic


# ─────────────────────────────────────────────
#  BATCH PROCESSING
# ─────────────────────────────────────────────

def classify_batch(tickets: list[TicketInput], llm_model: str = "groq/llama-3.1-8b-instant") -> list[ClassificationResult]:
    """Classifie un lot de tickets en parallèle."""
    results = []
    for ticket in tickets:
        try:
            result = classify_ticket(ticket, llm_model)
            results.append(result)
        except Exception as e:
            print(f"[ERROR] Ticket {ticket.numero}: {e}")
            # Fallback avec valeurs par défaut
            results.append(ClassificationResult(
                numero=ticket.numero,
                categorie="Incident",
                sous_categorie="Logiciel",
                service="O365-PowerBI",
                impact="3 - Mineur",
                urgence="3 - Faible",
                priorite_calculee="4 - Standard",
                confidence=0.0,
                reasoning=f"Erreur de classification automatique: {str(e)}"
            ))
    return results