from django.shortcuts import render

from .models import Element

def index(request):
  context = {
    'resistances': Element.objects.all()
  }
  return render(request, 'index.html', context)
